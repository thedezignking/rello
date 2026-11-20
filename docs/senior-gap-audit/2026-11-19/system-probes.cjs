/* eslint-disable @typescript-eslint/no-require-imports -- Offline audit evidence; imports are intercepted. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith(path.join('resumes', 'store.ts'))) source = source.replace('class SupabaseResumeStore', 'export class SupabaseResumeStore');
  const mod = { exports: {} };
  cache.set(file, mod);
  const localRequire = name => {
    if (name === 'server-only') return {};
    if (name === '@/lib/supabase/config') return { isSupabaseConfigured: () => true };
    if (name === '@/lib/supabase/client') return { createClient: () => { throw Error('Hosted connections forbidden'); } };
    if (name.startsWith('@/') || name.startsWith('.')) return load(`${name.startsWith('@/') ? path.join('src', name.slice(2)) : path.resolve(path.dirname(file), name)}.ts`);
    return require(name);
  };
  new Function('require', 'module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}
async function main() {
  global.fetch = async () => { throw Error('Network forbidden in persistence probe'); };
  const { emptyContent } = load('src/features/resumes/schema.ts');
  const { SupabaseResumeStore } = load('src/features/resumes/store.ts');
  const content = emptyContent();
  content.personal.name = 'Fictional audit user';
  content.summary = 'Original summary';
  const row = { id: crypto.randomUUID(), title: 'Offline fixture', template_id: 'classic', content, revision: 1, source_resume_id: null, job_id: null, created_at: '2026-11-19T12:00:00Z', updated_at: '2026-11-19T12:00:00Z' };
  const db = { from(table) {
    assert.equal(table, 'resumes');
    let patch;
    const predicates = [];
    const query = {
      update(value) { patch = value; return this; },
      eq(key, value) { predicates.push([key, value]); return this; },
      select() {
        if (!patch) return this;
        if (!predicates.every(([key, value]) => row[key] === value)) return Promise.resolve({ data: [], error: null });
        Object.assign(row, structuredClone(patch));
        row.revision++;
        return Promise.resolve({ data: [{ revision: row.revision, updated_at: row.updated_at }], error: null });
      },
      maybeSingle() { return Promise.resolve({ data: structuredClone(row), error: null }); },
    };
    return query;
  } };
  const store = new SupabaseResumeStore(db);
  const initial = await store.get(row.id);
  const saved = await store.saveContent(row.id, { ...initial.content, summary: 'x'.repeat(2001) }, initial.revision);
  const reloaded = await store.get(row.id);
  assert.equal(saved.ok, true);
  assert.equal(reloaded.content.personal.name, '');
  const next = { ...reloaded.content, summary: 'A later edit' };
  await store.saveContent(row.id, next, reloaded.revision);
  assert.equal(row.content.personal.name, '');
  const staleSave = await store.saveContent(row.id, content, initial.revision);
  assert.deepEqual(staleSave, { ok: false, reason: 'conflict' });

  process.env.OPENROUTER_API_KEY = 'offline-fixture';
  const { tailor } = load('src/features/tailor/engine.ts');
  const candidate = emptyContent();
  candidate.summary = 'Product designer who uses JavaScript to build internal prototypes.';
  let providerCalls = 0;
  global.fetch = async () => {
    providerCalls++;
    return { ok: true, status: 200, json: async () => ({ model: 'offline-fixture', choices: [{ message: { content: JSON.stringify({
      job: { title: 'Java Engineer', company: 'Fictional Example' },
      requirements: [{ text: 'Production Java backend development', kind: 'required', status: 'covered', evidence: ['summary'] }],
      suggestions: [], skills: { order: [], add: [{ name: 'Java', evidence: 'summary' }] },
    }) } }] }) };
  };
  const { result } = await tailor(candidate, 'Required: production Java backend development and database operations. This is a fictional audit fixture.', {});
  assert.equal(result.requirements[0].status, 'covered');
  assert.equal(result.skills.add[0].name, 'Java');
  assert.equal(providerCalls, 1);
  const evidence = {
    persistence: { implementation: 'actual SupabaseResumeStore with in-memory query adapter; no hosted DB', overlongSummarySaved: saved.ok, reloadErasesName: reloaded.content.personal.name === '', subsequentEditOverwritesOriginalName: row.content.personal.name === '', staleRevisionRejected: !staleSave.ok && staleSave.reason === 'conflict' },
    evidenceValidation: { suppliedResume: candidate.summary, acceptedRequirement: result.requirements[0], acceptedSkills: result.skills.add, providerCalls, note: 'Deliberately incorrect mocked model output tests the application boundary; this is not a measurement of real model behavior.' },
    sideEffects: 'In-memory fixtures only. All fetch calls intercepted; no credentials, hosted writes, emails, charges, or model requests.',
  };
  fs.writeFileSync(path.join(__dirname, 'system-probes.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
