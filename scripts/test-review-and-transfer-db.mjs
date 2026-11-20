import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

const db = new pg.Client({ connectionString: testDatabaseUrl(), ssl: false });
const [guest, user, other, unverified, resume, job, session] = Array.from({ length: 7 }, randomUUID);
const original = { personal: { name: "Fictional recovery fixture" }, summary: "Original summary" };
await db.connect();
await db.query("begin");
let checks = 0;
async function failure(sql, args, pattern) {
  await db.query("savepoint expected_failure");
  await assert.rejects(db.query(sql, args), pattern);
  await db.query("rollback to savepoint expected_failure");
  checks++;
}
async function identity(id) {
  await db.query("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
    [id ?? "", JSON.stringify(id ? { sub: id, role: "authenticated" } : {})],
  );
  await db.query(id ? "set local role authenticated" : "set local role service_role");
}
try {
  for (const id of [user, other])
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,is_anonymous) values($1,$2,now(),false)",
      [id, `${id}@example.invalid`],
    );
  await db.query("insert into auth.users(id,is_anonymous) values($1,true)", [guest]);
  await db.query("insert into auth.users(id,is_anonymous) values($1,false)", [unverified]);
  await db.query("insert into public.jobs(id,user_id,description) values($1,$2,'Fictional role')", [
    job,
    guest,
  ]);
  await db.query("insert into public.resumes(id,user_id,job_id,content) values($1,$2,$3,$4)", [
    resume,
    guest,
    job,
    original,
  ]);
  await db.query(
    "insert into public.tailor_sessions(id,user_id,resume_id,job_id,status,suggestions) values($1,$2,$3,$4,'ready',$5)",
    [session, guest, resume, job, { suggestions: [], skills: null }],
  );
  await identity(user);
  await failure("select public.transfer_guest_work($1,$2)", [guest, user], /permission denied/);
  await identity(null);
  await failure("select public.transfer_guest_work($1,$2)", [other, user], /invalid_transfer/);
  await failure("select public.transfer_guest_work($1,$2)", [guest, unverified], /invalid_transfer/);
  assert.equal((await db.query("select public.transfer_guest_work($1,$2) as n", [guest, user])).rows[0].n, 1);
  checks++;
  assert.equal((await db.query("select public.transfer_guest_work($1,$2) as n", [guest, user])).rows[0].n, 0);
  checks++;
  assert.equal((await db.query("select user_id from public.jobs where id=$1", [job])).rows[0].user_id, user);
  checks++;
  await identity(guest);
  assert.equal((await db.query("select id from public.resumes where id=$1", [resume])).rowCount, 0);
  checks++;
  await identity(user);
  assert.deepEqual(
    (await db.query("select content from public.resumes where id=$1", [resume])).rows[0].content,
    original,
  );
  checks++;
  const args = [
    resume,
    session,
    1,
    1,
    { ...original, summary: "Accepted summary" },
    { suggestions: [{ status: "accepted" }], skills: null },
  ];
  const sql = "select public.save_resume_review($1,$2,$3,$4,$5,$6) as result";
  const accepted = (await db.query(sql, args)).rows[0].result;
  assert.equal(accepted.ok, true);
  assert.equal(accepted.sessionRevision, 2);
  checks++;
  assert.deepEqual((await db.query(sql, args)).rows[0].result, { ok: false, reason: "conflict" });
  checks++;
  await failure(
    sql,
    [resume, session, accepted.revision, 2, { ...original, summary: "Must roll back" }, null],
    /null value/,
  );
  assert.equal(
    (await db.query("select content from public.resumes where id=$1", [resume])).rows[0].content.summary,
    "Accepted summary",
  );
  checks++;
  await identity(other);
  assert.equal(
    (await db.query(sql, [resume, session, accepted.revision, 2, original, {}])).rows[0].result.ok,
    false,
  );
  checks++;
  await identity(null);
  const first = (await db.query("select public.reserve_resource($1,'import',2) as id", [user])).rows[0].id;
  const second = (await db.query("select public.reserve_resource($1,'improve',2) as id", [user])).rows[0].id;
  await failure("select public.reserve_resource($1,'improve',2)", [user], /resource_busy/);
  for (const id of [first, second]) await db.query("select public.finish_resource($1,$2,false)", [user, id]);
  await failure("select public.reserve_resource($1,'improve',2)", [user], /resource_daily_limit/);
  await identity(user);
  await failure("select public.reserve_resource($1,'pdf',200)", [user], /permission denied/);
  console.log(
    `${checks} local review/guest-transfer/resource checks passed; rolling back fictional records.`,
  );
} finally {
  await db.query("rollback").catch(() => {});
  await db.end();
}
