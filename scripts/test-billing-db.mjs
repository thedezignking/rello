// Runs the real migration and accounting tests in ONE rollback-only transaction.
// No fixture users, grants, ledger entries, or schema changes are retained.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

const db = new pg.Client({ connectionString: testDatabaseUrl(), ssl: false });
const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFile = (await readdir(migrationDirectory)).find((name) =>
  name.endsWith("_billing_credits.sql"),
);
const migration = await readFile(new URL(migrationFile, migrationDirectory), "utf8");
let checks = 0;
const userA = randomUUID(),
  userB = randomUUID(),
  guest = randomUUID(),
  source = randomUUID();
const content = {
  personal: { name: "Billing fixture" },
  summary: "Built a design system for three teams.",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};
const result = {
  job: { title: "Designer", company: "Fixture" },
  requirements: [],
  suggestions: [
    {
      id: "fixture-line",
      targetId: "summary",
      section: "summary",
      original: content.summary,
      suggested: "Built a shared design system for three teams.",
      reason: "Makes the work clearer.",
      status: "pending",
    },
  ],
  skills: null,
};
async function rpc(name, args) {
  const values = Object.values(args),
    names = Object.keys(args);
  return (
    await db.query(
      `select public.${name}(${names.map((key, i) => `${key} => $${i + 1}`).join(",")}) as result`,
      values,
    )
  ).rows[0].result;
}
async function account(userId = userA) {
  return rpc("billing_account", { p_user_id: userId });
}
async function expectFailure(operation, match) {
  await db.query("savepoint expected_failure");
  let error;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  await db.query("rollback to savepoint expected_failure");
  assert.ok(error, "expected the operation to fail");
  assert.match(error.message, match);
  checks++;
}
async function start(hash, requestId = randomUUID()) {
  return rpc("billing_start_tailoring", {
    p_user_id: userA,
    p_request_id: requestId,
    p_source_id: source,
    p_revision: 1,
    p_hash: hash,
    p_description: "Fixture role requiring design systems and collaboration.",
    p_title: "Designer",
    p_company: "Fixture",
  });
}

try {
  await db.connect();
  await db.query("begin");
  await db.query("set local statement_timeout = '15s'");
  const installed = (await db.query("select to_regclass('public.credit_accounts') as table_name")).rows[0]
    .table_name;
  if (!installed) await db.query(migration);
  for (const id of [userA, userB])
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,is_anonymous) values($1,$2,now(),false)",
      [id, `billing-${id}@example.invalid`],
    );
  await db.query("insert into auth.users(id,is_anonymous) values($1,true)", [guest]);
  await db.query("insert into public.resumes(id,user_id,content,template_id) values($1,$2,$3,'classic')", [
    source,
    userA,
    content,
  ]);
  await db.query("set local role service_role");

  assert.equal((await account()).available, 10);
  checks++;
  assert.equal((await account()).available, 10);
  checks++;
  await expectFailure(() => account(guest), /account_required/);
  await db.query("reset role");
  await db.query("update auth.users set is_anonymous=false,email=$2,email_confirmed_at=now() where id=$1", [
    guest,
    `billing-${guest}@example.invalid`,
  ]);
  await db.query("set local role service_role");
  assert.equal((await account(guest)).available, 10);
  checks++;
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from public.credit_ledger where user_id=$1 and reason='signup'",
        [guest],
      )
    ).rows[0].count,
    1,
  );
  checks++;

  const runId = randomUUID();
  assert.equal((await start("first", runId)).kind, "started");
  assert.deepEqual(await account(), { available: 9, reserved: 1, debt: 0 });
  checks++;
  assert.equal((await start("first", runId)).kind, "running");
  assert.equal((await start("first")).kind, "running");
  checks++;
  await expectFailure(() => start("another-job"), /run_busy/);
  const saved = await rpc("billing_finish_tailoring", {
    p_user_id: userA,
    p_run_id: runId,
    p_result: result,
  });
  assert.equal(saved.charged, true);
  assert.equal((await account()).available, 9);
  checks++;
  assert.deepEqual(
    await rpc("billing_finish_tailoring", { p_user_id: userA, p_run_id: runId, p_result: result }),
    saved,
  );
  assert.equal((await account()).available, 9);
  checks++;
  assert.equal((await start("first")).resume_id, saved.resume_id);
  checks++;
  assert.deepEqual(
    (await db.query("select content from public.resumes where id=$1", [source])).rows[0].content,
    content,
  );
  checks++;

  const failed = await start("failed");
  await rpc("billing_release_tailoring", { p_user_id: userA, p_run_id: failed.run_id });
  await rpc("billing_release_tailoring", { p_user_id: userA, p_run_id: failed.run_id });
  assert.deepEqual(await account(), { available: 9, reserved: 0, debt: 0 });
  checks++;
  const empty = await start("no-useful-change");
  const emptySaved = await rpc("billing_finish_tailoring", {
    p_user_id: userA,
    p_run_id: empty.run_id,
    p_result: { ...result, suggestions: [] },
  });
  assert.equal(emptySaved.charged, false);
  assert.equal((await account()).available, 9);
  checks++;
  const expired = await start("expired");
  await db.query("update public.credit_tailoring_runs set expires_at=now()-interval '1 minute' where id=$1", [
    expired.run_id,
  ]);
  assert.deepEqual(await account(), { available: 9, reserved: 0, debt: 0 });
  checks++;

  const firstRetry = randomUUID();
  assert.equal(
    (
      await rpc("billing_start_retry", {
        p_user_id: userA,
        p_request_id: firstRetry,
        p_resume_id: saved.resume_id,
        p_hash: "retry-1",
      })
    ).kind,
    "started",
  );
  assert.equal(
    (
      await rpc("billing_start_retry", {
        p_user_id: userA,
        p_request_id: firstRetry,
        p_resume_id: saved.resume_id,
        p_hash: "retry-1",
      })
    ).kind,
    "running",
  );
  await rpc("billing_finish_retry", { p_user_id: userA, p_request_id: firstRetry, p_result: null });
  assert.equal(
    (
      await db.query("select used,reserved from public.credit_retry_allowances where resume_id=$1", [
        saved.resume_id,
      ])
    ).rows[0].used,
    0,
  );
  checks++;
  for (let index = 0; index < 10; index++) {
    const retryId = randomUUID();
    await rpc("billing_start_retry", {
      p_user_id: userA,
      p_request_id: retryId,
      p_resume_id: saved.resume_id,
      p_hash: `retry-${index}`,
    });
    await rpc("billing_finish_retry", {
      p_user_id: userA,
      p_request_id: retryId,
      p_result: { text: `Fixture rewrite ${index}`, reason: "Fixture" },
    });
    await rpc("billing_finish_retry", {
      p_user_id: userA,
      p_request_id: retryId,
      p_result: { text: `Fixture rewrite ${index}`, reason: "Fixture" },
    });
  }
  await expectFailure(
    () =>
      rpc("billing_start_retry", {
        p_user_id: userA,
        p_request_id: randomUUID(),
        p_resume_id: saved.resume_id,
        p_hash: "eleventh",
      }),
    /retry_limit/,
  );
  assert.equal((await account()).available, 9);
  checks++;
  await expectFailure(
    () =>
      rpc("billing_start_retry", {
        p_user_id: userB,
        p_request_id: randomUUID(),
        p_resume_id: saved.resume_id,
        p_hash: "stolen",
      }),
    /retry_not_available/,
  );

  const reference = `rello_${randomUUID().replaceAll("-", "")}`;
  await db.query(
    "insert into public.credit_orders(user_id,reference,pack_id,amount,currency,credits) values($1,$2,'starter',200,'USD',5)",
    [userA, reference],
  );
  await expectFailure(
    () =>
      rpc("billing_fulfill_order", {
        p_reference: reference,
        p_amount: 1,
        p_currency: "USD",
        p_transaction_id: "fixture-payment",
      }),
    /payment_mismatch/,
  );
  await rpc("billing_fulfill_order", {
    p_reference: reference,
    p_amount: 200,
    p_currency: "USD",
    p_transaction_id: "fixture-payment",
  });
  await rpc("billing_fulfill_order", {
    p_reference: reference,
    p_amount: 200,
    p_currency: "USD",
    p_transaction_id: "fixture-payment",
  });
  assert.equal((await account()).available, 14);
  checks++;
  await rpc("billing_fulfill_order", {
    p_reference: reference,
    p_amount: 200,
    p_currency: "USD",
    p_transaction_id: "fixture-payment",
    p_reversed: true,
  });
  await rpc("billing_fulfill_order", {
    p_reference: reference,
    p_amount: 200,
    p_currency: "USD",
    p_transaction_id: "fixture-payment",
    p_reversed: true,
  });
  assert.equal((await account()).available, 9);
  checks++;

  await db.query("reset role");
  await db.query(
    "select set_config('request.jwt.claims',$1,true),set_config('request.jwt.claim.sub',$2,true)",
    [JSON.stringify({ sub: userA, role: "authenticated", is_anonymous: false }), userA],
  );
  await db.query("set local role authenticated");
  assert.equal(
    (await db.query("select count(*)::int as count from public.credit_accounts")).rows[0].count,
    1,
  );
  checks++;
  await expectFailure(
    () => db.query("update public.credit_accounts set balance=9999 where user_id=$1", [userA]),
    /permission denied/,
  );
  await expectFailure(
    () =>
      db.query(
        "insert into public.credit_ledger(user_id,amount,reason,reference) values($1,999,'signup','fake')",
        [userA],
      ),
    /permission denied/,
  );
  await expectFailure(() => account(userA), /permission denied/);
  await db.query("reset role");
  await db.query(
    "select set_config('request.jwt.claims','{}',true),set_config('request.jwt.claim.sub','',true)",
  );
  await db.query("set local role service_role");
  await db.query("update public.credit_accounts set balance=0 where user_id=$1", [userB]);
  await expectFailure(
    () =>
      rpc("billing_start_tailoring", {
        p_user_id: userB,
        p_request_id: randomUUID(),
        p_source_id: source,
        p_revision: 1,
        p_hash: "no-funds",
        p_description: "Fixture",
        p_title: "",
        p_company: "",
      }),
    /no_credits/,
  );
  console.log(`${checks} billing database checks passed; rolling back all changes.`);
} finally {
  await db.query("rollback").catch(() => {});
  await db.end();
}
