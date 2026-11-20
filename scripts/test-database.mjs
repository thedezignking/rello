export function testDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
  if (!value)
    throw new Error(
      "TEST_DATABASE_URL must point to a disposable local rello_test database. Hosted test targets are refused.",
    );
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search || url.hash)
    throw Error("Use a plain Postgres URL without routing/query overrides for tests.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/rello_test")
    throw new Error("Refusing database tests outside the local rello_test database.");
  return url.href;
}
