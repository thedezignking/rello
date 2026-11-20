/* eslint-disable @typescript-eslint/no-require-imports -- Offline harness loads the actual store with isolated adapters. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function modules(configured, db) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    function localRequire(name) {
      if (name === "@/lib/supabase/config") return { isSupabaseConfigured: () => configured };
      if (name === "@/lib/supabase/client") return { createClient: () => db };
      if (name.startsWith("@/") || name.startsWith("."))
        return load(
          `${name.startsWith("@/") ? path.join("src", name.slice(2)) : path.resolve(path.dirname(file), name)}.ts`,
        );
      return require(name);
    }
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "module", "exports", compiled)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return { ...load("src/features/resumes/schema.ts"), ...load("src/features/resumes/store.ts") };
}

function database() {
  const rows = new Map();
  let queries = 0;
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "fixture-user" } }, error: null }) },
    from(table) {
      queries++;
      assert.equal(table, "resumes", "unexpected database operation");
      let patch, inserted;
      const predicates = [];
      const query = {
        select() {
          return this;
        },
        order() {
          return this;
        },
        range() {
          return this;
        },
        eq(key, value) {
          predicates.push([key, value]);
          return this;
        },
        insert(value) {
          inserted = value;
          return this;
        },
        update(value) {
          patch = value;
          return this;
        },
        execute() {
          if (inserted) {
            const row = {
              id: crypto.randomUUID(),
              revision: 1,
              created_at: "2026-11-19",
              updated_at: "2026-11-19",
              ...structuredClone(inserted),
            };
            rows.set(row.id, row);
            return { data: [structuredClone(row)], error: null };
          }
          const found = [...rows.values()].filter((row) =>
            predicates.every(([key, value]) => row[key] === value),
          );
          if (patch)
            for (const row of found) {
              Object.assign(row, structuredClone(patch));
              row.revision++;
            }
          return { data: structuredClone(found), error: null };
        },
        maybeSingle() {
          const out = this.execute();
          return Promise.resolve({ ...out, data: out.data[0] ?? null });
        },
        single() {
          return this.maybeSingle();
        },
        then(resolve, reject) {
          return Promise.resolve(this.execute()).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, rows, queries: () => queries };
}

async function main() {
  process.env.NODE_ENV = "development";
  global.fetch = async () => {
    throw Error("Network is forbidden in persistence checks");
  };
  const memory = new Map();
  global.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  const remote = database();
  let suites = 0;
  for (const [name, runtime] of [
    ["local", modules(false)],
    ["supabase", modules(true, remote.db)],
  ]) {
    const { getResumeStore, emptyContent, parseContent, ResumeContentError, resumeContentSchema } = runtime;
    const store = getResumeStore();
    const content = emptyContent();
    content.personal.name = "Fictional regression user";
    content.summary = "Original summary";
    const resume = await store.create({ templateId: "classic", content });
    const tooLong = { ...content, summary: "x".repeat(2001) };
    const queriesBefore = remote.queries();
    assert.deepEqual(await store.saveContent(resume.id, tooLong, resume.revision), {
      ok: false,
      reason: "invalid",
    });
    if (name === "supabase")
      assert.equal(remote.queries(), queriesBefore, "invalid saves cannot reach the database");
    assert.equal((await store.get(resume.id)).content.personal.name, content.personal.name);
    assert.equal((await store.get(resume.id)).content.summary, content.summary);
    await assert.rejects(store.create({ templateId: "classic", content: tooLong }), /fields/i);
    assert.deepEqual(parseContent(tooLong), tooLong, "old overlong documents remain complete and readable");
    assert.equal(resumeContentSchema.safeParse(tooLong).success, false);
    const oldSkills = { ...content, skills: [{ id: "old-skill", name: "s".repeat(81) }] };
    assert.equal(parseContent(oldSkills).skills[0].name.length, 81);
    assert.deepEqual(await store.saveContent(resume.id, oldSkills, resume.revision), {
      ok: false,
      reason: "invalid",
    });
    const next = { ...content, summary: "Updated summary" };
    const saved = await store.saveContent(resume.id, next, resume.revision);
    assert.equal(saved.ok, true);
    assert.deepEqual(await store.saveContent(resume.id, content, resume.revision), {
      ok: false,
      reason: "conflict",
    });
    assert.equal((await store.get(resume.id)).content.summary, next.summary);
    const partial = parseContent({ personal: { name: "Legacy name" } });
    assert.equal(partial.personal.name, "Legacy name");
    assert.equal(partial.experience.length, 0);
    for (const raw of [
      null,
      [],
      "broken",
      { experience: "broken" },
      { summary: "Keep me", unsupportedSection: ["Keep this too"] },
    ]) {
      assert.throws(
        () => parseContent(raw),
        (error) => error instanceof ResumeContentError && error.rawContent === raw,
      );
    }
    if (name === "supabase") remote.rows.get(resume.id).content = tooLong;
    else {
      const legacyRows = JSON.parse(memory.get("rello.dev.resumes"));
      legacyRows.find((row) => row.id === resume.id).content = tooLong;
      memory.set("rello.dev.resumes", JSON.stringify(legacyRows));
    }
    const legacy = await store.get(resume.id);
    assert.equal(legacy.content.summary.length, 2001);
    assert.equal(legacy.content.personal.name, content.personal.name);
    assert.deepEqual(
      await store.saveContent(
        resume.id,
        { ...legacy.content, personal: { ...legacy.content.personal, headline: "A later edit" } },
        legacy.revision,
      ),
      { ok: false, reason: "invalid" },
    );
    assert.equal((await store.get(resume.id)).content.personal.name, content.personal.name);
    assert.equal(
      (
        await store.saveContent(
          resume.id,
          { ...legacy.content, summary: "Repaired summary" },
          legacy.revision,
        )
      ).ok,
      true,
    );
    assert.equal(
      (await store.get(resume.id)).content.personal.name,
      content.personal.name,
      "repairing an old long field preserves the rest of the document",
    );
    if (name === "supabase") {
      const row = remote.rows.get(resume.id);
      row.content = { ...content, experience: "unreadable" };
      const before = JSON.stringify(row);
      await assert.rejects(
        store.get(resume.id),
        (error) => error instanceof ResumeContentError && error.rawContent.experience === "unreadable",
      );
      assert.equal((await store.list()).find((r) => r.id === resume.id).content, undefined);
      await store.create({ templateId: "classic", content });
      assert.equal(JSON.stringify(row), before, "other operations do not replace malformed content");
      row.content = tooLong;
      assert.equal((await store.get(resume.id)).content.summary.length, 2001);
      row.schema_version = 99;
      await assert.rejects(store.get(resume.id), ResumeContentError);
      assert.equal((await store.list()).find((r) => r.id === resume.id).content, undefined);
    } else {
      const raw = JSON.parse(memory.get("rello.dev.resumes"));
      raw[0].content = { ...content, experience: "unreadable" };
      memory.set("rello.dev.resumes", JSON.stringify(raw));
      await assert.rejects(store.get(resume.id), ResumeContentError);
      assert.equal((await store.list())[0].content, undefined);
      const healthy = await store.create({ templateId: "classic", content });
      await store.update(healthy.id, { title: "Renamed fixture" });
      assert.deepEqual(
        JSON.parse(memory.get("rello.dev.resumes"))[0].content,
        raw[0].content,
        "unrelated writes preserve the raw invalid document",
      );
      memory.set("rello.dev.resumes", "[");
      await assert.rejects(
        store.list(),
        (error) => error instanceof ResumeContentError && error.rawContent === "[",
      );
      await assert.rejects(store.create({ templateId: "classic", content }), ResumeContentError);
      assert.equal(
        memory.get("rello.dev.resumes"),
        "[",
        "a corrupt collection must not be overwritten with a new empty list",
      );
    }
    suites++;
    console.log(
      `${name}: invalid writes blocked, old text retained, malformed records recoverable, revisions protected.`,
    );
  }
  console.log(`${suites} persistence suites passed; no hosted writes or network requests.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
