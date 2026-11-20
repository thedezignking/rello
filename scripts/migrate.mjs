// Applies supabase/migrations/*.sql to the database in SUPABASE_DB_URL, in
// filename order, each once and inside a transaction. Applied versions are
// recorded in supabase_migrations.schema_migrations — the same table the
// Supabase CLI uses — so the two can be mixed later.
//
//   npm run db:migrate            apply pending migrations
//   npm run db:migrate -- --dry   list what would run

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { migrationConfig } from "./migration-config.mjs";

const dry = process.argv.includes("--dry");
const dir = path.resolve("supabase/migrations");

const client = new pg.Client(migrationConfig(process.env, process.argv));

try {
  await client.connect();
  if (dry) await client.query("begin read only");
  else
    await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const exists = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') as relation",
  );
  const { rows } = exists.rows[0].relation
    ? await client.query("select version from supabase_migrations.schema_migrations")
    : { rows: [] };
  const applied = new Set(rows.map((r) => r.version));

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  const pending = files.filter((f) => !applied.has(f.split("_")[0]));

  if (!pending.length) {
    console.log("Nothing to apply — the database is up to date.");
  }
  for (const file of pending) {
    const version = file.split("_")[0];
    const name = file.replace(/^\d+_|\.sql$/g, "");
    if (dry) {
      console.log(`would apply ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations (version, statements, name) values ($1, $2, $3)",
        [version, [sql], name],
      );
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      console.error(`failed ${file} — nothing from it was kept:\n  ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} catch (error) {
  console.error(`Couldn't run migrations: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
