import { it, expect } from "vitest";
import { migrationConfig } from "../scripts/migration-config.mjs";
import { testDatabaseUrl } from "../scripts/test-database.mjs";
it("requires a named remote target and explicit apply flag", () => {
  const env = {
    SUPABASE_DB_URL: "postgresql://user:fixture@db.example.com/app",
    APP_ENV: "production",
    MIGRATION_DB_HOST: "db.example.com",
  };
  expect(() => migrationConfig(env, [])).toThrow("--apply-production");
  expect(migrationConfig(env, ["--dry"]).ssl.rejectUnauthorized).toBe(true);
  expect(() => migrationConfig({ ...env, MIGRATION_DB_HOST: "other.example.com" }, ["--dry"])).toThrow(
    "intended database host",
  );
  expect(() =>
    migrationConfig({ ...env, SUPABASE_DB_URL: env.SUPABASE_DB_URL + "?sslmode=no-verify" }, ["--dry"]),
  ).toThrow("SSL query");
  expect(migrationConfig({ SUPABASE_DB_URL: "postgresql://user:fixture@127.0.0.1/rello_test" }, []).ssl).toBe(
    false,
  );
});

it("rejects database query parameters that can override a checked host", () => {
  const local = "postgresql://postgres:fixture@127.0.0.1/rello_test";
  expect(testDatabaseUrl(local)).toBe(local);
  expect(() => testDatabaseUrl(local + "?host=live.example.com")).toThrow("overrides");
  expect(() => testDatabaseUrl("postgresql://postgres:fixture@live.example.com/rello_test")).toThrow(
    "outside",
  );
  expect(() => testDatabaseUrl(local.replace("rello_test", "production"))).toThrow("outside");
  expect(() => migrationConfig({ SUPABASE_DB_URL: local + "?host=live.example.com" }, ["--dry"])).toThrow(
    "routing overrides",
  );
});
