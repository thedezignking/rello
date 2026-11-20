import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";
const settings = { connectionString: testDatabaseUrl(), ssl: false };
const admin = new pg.Client(settings);
const pool = new pg.Pool({ ...settings, max: 6 });
const id = randomUUID();
await admin.connect();
try {
  await admin.query("insert into auth.users(id,is_anonymous) values($1,true)", [id]);
  const attempts = await Promise.allSettled(
    Array.from({ length: 6 }, async () => {
      const client = await pool.connect();
      try {
        await client.query("begin; set local role service_role");
        const result = await client.query("select public.reserve_resource($1,'improve',40) as id", [id]);
        await client.query("commit");
        return result.rows[0].id;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }),
  );
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 2);
  const rejected = attempts.filter((r) => r.status === "rejected");
  assert.equal(rejected.length, 4);
  assert.ok(rejected.every((r) => r.reason.message === "resource_busy"));
  console.log("Six concurrent resource requests enforce exactly two active reservations.");
} finally {
  await pool.end();
  await admin.query("delete from auth.users where id=$1", [id]);
  await admin.end();
}
