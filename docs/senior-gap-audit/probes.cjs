/* eslint-disable @typescript-eslint/no-require-imports -- Read-only audit harness for source modules. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith(path.join('auth', 'callback', 'route.ts'))) source = source.replace('function safeNext(', 'export function safeNext(');
  const mod = { exports: {} }; cache.set(file, mod);
  const localRequire = name => {
    if (name === '@/lib/supabase/config') return { isSupabaseConfigured: () => false };
    if (name === '@/lib/supabase/client' || name === '@/lib/supabase/server') return { createClient: () => { throw Error('No live database access allowed'); } };
    if (name === 'next/server') return { NextResponse: {} };
    if (name === 'server-only') return {};
    if (name.startsWith('@/') || name.startsWith('.')) return load(`${name.startsWith('@/') ? path.join('src', name.slice(2)) : path.resolve(path.dirname(file), name)}.ts`);
    return require(name);
  };
  new Function('require', 'module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}
(async () => {
  process.env.NODE_ENV = 'development';
  const memory = new Map();
  global.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const { emptyContent, parseContent } = load('src/features/resumes/schema.ts');
  const { getResumeStore } = load('src/features/resumes/store.ts');
  const store = getResumeStore();
  const initial = emptyContent(); initial.personal.name = 'Audit fixture'; initial.summary = 'Original summary';
  const resume = await store.create({ templateId: 'classic', content: initial });
  const write = await store.saveContent(resume.id, { ...initial, summary: 'x'.repeat(2001) }, resume.revision);
  const reloaded = await store.get(resume.id);
  assert.equal(write.ok, true);
  assert.equal(reloaded.content.personal.name, '');
  assert.equal(reloaded.content.summary, '');
  const wholeDocumentEmpty = JSON.stringify(reloaded.content) === JSON.stringify(emptyContent());
  const subsequent = structuredClone(reloaded.content);
  subsequent.personal.headline = 'A new headline';
  await store.saveContent(resume.id, subsequent, reloaded.revision);
  const rawAfterEdit = JSON.parse(memory.get('rello.dev.resumes'))[0].content;
  assert.equal(rawAfterEdit.personal.name, '');
  const { safeNext } = load('src/app/auth/callback/route.ts');
  const target = String.fromCharCode(47, 92) + 'attacker.invalid';
  const redirect = new URL(safeNext(target), 'https://rello.example').origin;
  assert.equal(redirect, 'https://attacker.invalid');
  const result = { longField: { length: 2001, saveReportedSuccess: write.ok, reloadedName: reloaded.content.personal.name, wholeDocumentEmpty, subsequentEditErasesOriginalName: rawAfterEdit.personal.name === '' }, normalContentName: parseContent(initial).personal.name, redirect: { suppliedPath: target, resolvedOrigin: redirect }, sideEffects: 'In-memory localStorage only; Supabase calls blocked; no network' };
  fs.writeFileSync(path.join(__dirname, 'source-probes.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
