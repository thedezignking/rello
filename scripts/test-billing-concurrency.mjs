// Creates one short-lived fixture account, tests concurrent accounting, deletes it.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

const clients = Array.from(
  { length: 3 },
  () => new pg.Client({ connectionString: testDatabaseUrl(), ssl: false, statement_timeout: 15000 }),
);
const [setup, first, second] = clients;
const user = randomUUID(),
  source = randomUUID();
const reference = `rello_${randomUUID().replaceAll("-", "")}`;
const content = {
  personal: { name: "Concurrency fixture" },
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
      reason: "Clearer wording",
      status: "pending",
    },
  ],
  skills: null,
};
let created = false;
try {
  await Promise.all(clients.map((client) => client.connect()));
  await setup.query(
    "insert into auth.users(id,email,email_confirmed_at,is_anonymous) values($1,$2,now(),false)",
    [user, `concurrency-${user}@example.invalid`],
  );
  created = true;
  await setup.query("insert into public.resumes(id,user_id,content) values($1,$2,$3)", [
    source,
    user,
    content,
  ]);
  await setup.query("update public.credit_accounts set balance=1 where user_id=$1", [user]);
  await Promise.all([first, second].map((client) => client.query("set role service_role")));
  const requests = [randomUUID(), randomUUID()];
  const starts = await Promise.allSettled(
    [first, second].map((client, i) =>
      client.query(
        "select public.billing_start_tailoring($1,$2,$3,1,$4,'Fixture job','Designer','Fixture') as result",
        [user, requests[i], source, `job-${i}`],
      ),
    ),
  );
  assert.equal(
    starts.filter((r) => r.status === "fulfilled").length,
    1,
    "only one concurrent request may reserve the last credit",
  );
  assert.match(starts.find((r) => r.status === "rejected").reason.message, /run_busy|no_credits/);
  const winner = starts.find((r) => r.status === "fulfilled").value.rows[0].result.run_id;
  assert.deepEqual(
    (await setup.query("select balance,reserved from public.credit_accounts where user_id=$1", [user]))
      .rows[0],
    { balance: 1, reserved: 1 },
  );
  const finished = await Promise.all(
    [first, second].map((client) =>
      client.query("select public.billing_finish_tailoring($1,$2,$3) as result", [user, winner, result]),
    ),
  );
  assert.equal(finished[0].rows[0].result.resume_id, finished[1].rows[0].result.resume_id);
  assert.deepEqual(
    (await setup.query("select balance,reserved from public.credit_accounts where user_id=$1", [user]))
      .rows[0],
    { balance: 0, reserved: 0 },
  );
  assert.equal(
    (
      await setup.query(
        "select count(*)::int as count from public.credit_ledger where user_id=$1 and reason='tailor'",
        [user],
      )
    ).rows[0].count,
    1,
  );
  await setup.query(
    "insert into public.credit_orders(user_id,reference,pack_id,amount,currency,credits) values($1,$2,'starter',200,'USD',5)",
    [user, reference],
  );
  await Promise.all(
    [first, second].map((client) =>
      client.query("select public.billing_fulfill_order($1,200,'USD','fixture-concurrent-payment')", [
        reference,
      ]),
    ),
  );
  assert.equal(
    (await setup.query("select balance from public.credit_accounts where user_id=$1", [user])).rows[0]
      .balance,
    5,
  );
  assert.equal(
    (
      await setup.query(
        "select count(*)::int as count from public.credit_ledger where user_id=$1 and reason='purchase'",
        [user],
      )
    ).rows[0].count,
    1,
  );
  console.log("8 concurrent accounting checks passed; deleting fixture account and purchase.");
} finally {
  if (created) {
    await setup.query("delete from auth.users where id=$1", [user]);
    await setup.query("delete from public.credit_orders where reference=$1", [reference]);
  }
  await Promise.all(clients.map((client) => client.end().catch(() => {})));
}
