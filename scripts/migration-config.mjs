import fs from "node:fs";

export function migrationConfig(env, argv) {
  if (!env.SUPABASE_DB_URL) throw Error("Set SUPABASE_DB_URL explicitly for the migration target.");
  const url = new URL(env.SUPABASE_DB_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw Error("Use a Postgres migration URL.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && !["staging", "production"].includes(env.APP_ENV))
    throw Error("Set APP_ENV=staging or production for a remote target.");
  if (!local && url.hostname !== env.MIGRATION_DB_HOST)
    throw Error("MIGRATION_DB_HOST must match the intended database host.");
  if (!local && !argv.includes("--dry") && !argv.includes(`--apply-${env.APP_ENV}`))
    throw Error(`Applying to ${env.APP_ENV} requires --apply-${env.APP_ENV}. Run --dry first.`);
  // Connection-string ssl parameters override pg's ssl object; reject rather
  // than silently weakening certificate verification.
  for (const key of url.searchParams.keys()) {
    if (key.startsWith("ssl"))
      throw Error("Remove SSL query parameters; use SUPABASE_DB_CA_FILE for verified TLS.");
    if (!["application_name", "options", "connect_timeout"].includes(key))
      throw Error("Connection routing overrides are not allowed in migration URLs.");
  }
  return {
    connectionString: env.SUPABASE_DB_URL,
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ...(env.SUPABASE_DB_CA_FILE ? { ca: fs.readFileSync(env.SUPABASE_DB_CA_FILE, "utf8") } : {}),
        },
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  };
}
