import fs from "node:fs/promises";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

const db = new pg.Client({ connectionString: testDatabaseUrl(), ssl: false });
await db.connect();
try {
  if (process.argv.includes("--reset"))
    await db.query(
      "drop schema if exists public cascade; drop schema if exists private cascade; drop schema if exists supabase_migrations cascade; create schema public;",
    );
  await db.query(`
    create schema if not exists auth;
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create table if not exists auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false, raw_user_meta_data jsonb default '{}');
    alter table auth.users add column if not exists is_anonymous boolean default false;
    alter table auth.users add column if not exists email text;
    alter table auth.users add column if not exists email_confirmed_at timestamptz;
    alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}';
    create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select on auth.users to service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations(version text primary key);
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    const version = name.split("_")[0];
    if (
      (await db.query("select 1 from supabase_migrations.schema_migrations where version=$1", [version]))
        .rowCount
    )
      continue;
    await db.query("begin");
    try {
      await db.query(await fs.readFile(new URL(name, directory), "utf8"));
      await db.query("insert into supabase_migrations.schema_migrations(version) values($1)", [version]);
      await db.query("commit");
      console.log(`Local test migration: ${name}`);
    } catch (error) {
      await db.query("rollback");
      throw error;
    }
  }
} finally {
  await db.end();
}
