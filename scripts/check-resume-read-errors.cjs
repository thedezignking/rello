/* eslint-disable @typescript-eslint/no-require-imports -- Offline checks of server read failures. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = new Map();
let result;
let rendered = 0;
let lastPayload;
const db = {
  auth: { getUser: async () => ({ data: { user: { id: "fixture-user", is_anonymous: false } } }) },
  from() {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle: async () => result,
    };
  },
};
function fail(status, code, message) {
  return Response.json({ error: { code, message } }, { status });
}
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  function localRequire(name) {
    if (name === "server-only") return {};
    if (name === "@/lib/error-reporting") return { reportError: () => {} };
    if (name === "next/server") return { NextResponse: { json: Response.json.bind(Response) } };
    if (name === "@/lib/supabase/server") return { createClient: async () => db };
    if (name === "@/lib/supabase/config") return { isSupabaseConfigured: () => true };
    if (name === "@/features/pdf/render")
      return {
        renderPdf: async (_origin, payload) => {
          rendered++;
          lastPayload = payload;
          return Buffer.from("%PDF-fixture");
        },
      };
    if (name === "@/features/ai/guard")
      return { authorize: async () => ({ ok: true, caller: { db, userId: "fixture-user" } }), fail };
    if (name.startsWith("@/") || name.startsWith("."))
      return load(
        `${name.startsWith("@/") ? path.join("src", name.slice(2)) : path.resolve(path.dirname(file), name)}.ts`,
      );
    return require(name);
  }
  new Function(
    "require",
    "module",
    "exports",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  )(localRequire, mod, mod.exports);
  return mod.exports;
}
async function main() {
  global.fetch = async () => {
    throw Error("Network forbidden in read-error checks");
  };
  const { emptyContent } = load("src/features/resumes/schema.ts");
  const { loadContext } = load("src/features/tailor/server.ts");
  const { POST } = load("src/app/api/pdf/route.ts");
  const id = crypto.randomUUID();
  const request = () =>
    Object.assign(
      new Request("https://fixture.invalid/api/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }),
      { nextUrl: { origin: "https://fixture.invalid" } },
    );
  const content = emptyContent();
  content.personal.name = "Fictional fixture";
  const row = { title: "Fixture", template_id: "classic", revision: 1, schema_version: 1, content };
  for (const [response, expected] of [
    [{ data: null, error: { message: "Connection failed" } }, 503],
    [{ data: null, error: null }, 404],
    [{ data: { ...row, content: { experience: "broken" } }, error: null }, 422],
    [{ data: { ...row, schema_version: 99 }, error: null }, 422],
  ]) {
    result = response;
    const context = await loadContext(id, undefined);
    assert.equal(context.ok, false);
    assert.equal(context.response.status, expected);
    assert.equal((await POST(request())).status, expected);
    assert.equal(rendered, 0, "a failed read must never render a blank PDF");
  }
  result = { data: row, error: null };
  assert.equal((await loadContext(id, undefined)).ok, true);
  assert.equal((await POST(request())).status, 200);
  assert.equal(lastPayload.content.personal.name, content.personal.name);
  result = { data: { ...row, content: { ...content, summary: "x".repeat(2001) } }, error: null };
  assert.equal(
    (await loadContext(id, undefined)).response.status,
    422,
    "AI must not create new copies with invalid content",
  );
  assert.equal((await POST(request())).status, 200, "existing long text can still be exported intact");
  assert.equal(lastPayload.content.summary.length, 2001);
  console.log(
    "Server read checks passed: distinct outage/missing/recovery responses, no blank PDFs, existing text preserved. No browser, AI, or hosted database used.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
