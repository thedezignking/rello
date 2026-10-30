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

const dry = process.argv.includes("--dry");
const dir = path.resolve("supabase/migrations");

function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const line = fs.readFileSync(".env.local", "utf8").match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)$/m);
  if (!line) throw new Error("Set SUPABASE_DB_URL in .env.local");
  return line[1].trim().replace(/^["']|["']$/g, "");
}

const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
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
