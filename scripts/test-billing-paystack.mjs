// Pure payment boundary tests. All provider HTTP calls are mocked; no charges occur.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const compiled = new Map();
async function moduleUrl(name) {
  if (compiled.has(name)) return compiled.get(name);
  let source = await readFile(new URL(`../src/features/billing/${name}.ts`, import.meta.url), "utf8");
  source = source.replace('import "server-only";', "");
  for (const dependency of ["catalog", "billing-error", "errors"]) {
    if (source.includes(`from "./${dependency}"`))
      source = source.replaceAll(`from "./${dependency}"`, `from "${await moduleUrl(dependency)}"`);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  compiled.set(name, url);
  return url;
}
const { quotePacks, validatePayment, validWebhook, initializePayment, verifyPayment, paymentOrigin } =
  await import(await moduleUrl("paystack"));
let checks = 0;
function check(operation) {
  operation();
  checks++;
}
const env = { PAYSTACK_SECRET_KEY: "sk_test_fixture", PAYSTACK_WEBHOOK_SECRET: "whsec_fixture" };
check(() =>
  assert.deepEqual(
    quotePacks({}).map((q) => [q.currency, q.amount, q.credits]),
    [
      ["USD", 200, 5],
      ["USD", 500, 20],
    ],
  ),
);
check(() =>
  assert.deepEqual(
    quotePacks({ PAYSTACK_NGN_PER_USD: "1500" })
      .filter((q) => q.currency === "NGN")
      .map((q) => q.amount),
    [300000, 750000],
  ),
);
for (const rate of ["0", "-1", "NaN", "Infinity", "1000001"])
  check(() => assert.equal(quotePacks({ PAYSTACK_NGN_PER_USD: rate }).length, 2));
const order = {
  id: "fixture-order",
  reference: `rello_${"a".repeat(32)}`,
  amount: 200,
  currency: "USD",
  status: "pending",
  pack_id: "starter",
};
const payment = {
  id: 42,
  reference: order.reference,
  amount: 200,
  currency: "USD",
  domain: "test",
  metadata: { rello_order_id: order.id },
  status: "success",
};
check(() => assert.equal(validatePayment(order, payment, env), "42"));
for (const patch of [
  { amount: 1 },
  { currency: "NGN" },
  { reference: "other" },
  { domain: "live" },
  { metadata: {} },
  { id: -1 },
  { id: "0" },
  { id: {} },
])
  check(() => assert.throws(() => validatePayment(order, { ...payment, ...patch }, env), /doesn’t match/));
const raw = Buffer.from(JSON.stringify({ event: "charge.success", data: payment }));
const legacy = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
check(() => assert.equal(validWebhook(raw, new Headers({ "x-paystack-signature": legacy }), env), true));
check(() =>
  assert.equal(
    validWebhook(
      Buffer.concat([raw, Buffer.from(" ")]),
      new Headers({ "x-paystack-signature": legacy }),
      env,
    ),
    false,
  ),
);
check(() => assert.equal(validWebhook(raw, new Headers(), env), false));
const now = 1800000000;
const signature = createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET)
  .update(`${now}.`)
  .update(raw)
  .digest("hex");
const current = new Headers({ "Paystack-Signature": `t=${now},v1=whk_fixture:${signature}` });
check(() => assert.equal(validWebhook(raw, current, env, now), true));
check(() => assert.equal(validWebhook(raw, current, env, now + 301), false));
check(() => assert.equal(validWebhook(raw, current, env, now - 301), false));
check(() => assert.equal(validWebhook(raw, current, {}, now), false));
check(() =>
  assert.equal(
    validWebhook(
      raw,
      new Headers({
        "Paystack-Signature": `t=${now},v1=whk_fixture:invalid`,
        "x-paystack-signature": legacy,
      }),
      env,
      now,
    ),
    false,
  ),
);
process.env.PAYSTACK_SECRET_KEY = env.PAYSTACK_SECRET_KEY;
process.env.NEXT_PUBLIC_SITE_URL = "https://rello.example";
check(() => assert.equal(paymentOrigin(), "https://rello.example"));
const originalFetch = globalThis.fetch;
try {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, ...JSON.parse(init.body) };
    return Response.json({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com/fixture" },
    });
  };
  assert.equal(
    await initializePayment(order, "fixture@example.invalid", paymentOrigin()),
    "https://checkout.paystack.com/fixture",
  );
  checks++;
  check(() => assert.equal(sent.amount, 200));
  check(() => assert.equal(sent.metadata.rello_order_id, order.id));
  check(() =>
    assert.equal(sent.callback_url, `https://rello.example/settings/billing?reference=${order.reference}`),
  );
  globalThis.fetch = async () =>
    Response.json({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com.evil.invalid/fixture" },
    });
  await assert.rejects(
    () => initializePayment(order, "fixture@example.invalid", paymentOrigin()),
    /invalid checkout link/,
  );
  checks++;
  await assert.rejects(() => verifyPayment("../../invalid"), /invalid/);
  checks++;
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`${checks} Paystack boundary checks passed; no real payments made.`);
