/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness loads transpiled server modules. */
// Runs the production tailoring engine against fictional examples only.
// node --env-file=.env.local scripts/evaluate-tailoring.cjs [--live]
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (id) => {
    if (id === 'server-only') return {};
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.join('src', id.slice(2)) : path.resolve(path.dirname(file), id);
      return load(`${base}.ts`);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { SAMPLE_CONTENT } = load('src/features/templates/sample.ts');
const { tailor } = load('src/features/tailor/engine.ts');
const cases = [
  ['strong-match', 'Product Designer at Acme Pay. Improve merchant onboarding for fintech products. Required: design systems, usability testing, collaboration with engineers. Preferred: mentor designers.'],
  ['career-switch', 'Customer Researcher at Civic Labs. Required: interview customers, synthesize research, communicate findings. Preferred: public-sector research experience. Do not assume prior public-sector experience.'],
  ['weak-match', 'Principal Backend Engineer at DataWorks. Required: production Rust, Kubernetes, distributed databases, manage engineers and lead incident response. Ten years of backend engineering required.'],
];
async function main() {
  const live = process.argv.includes('--live');
  if (live && !process.env.OPENROUTER_API_KEY) throw Error('OPENROUTER_API_KEY is required for live evaluation');
  let calls = 0;
  if (!live) {
    process.env.OPENROUTER_API_KEY = 'fixture';
    global.fetch = async (_url, options) => {
      calls++;
      if (JSON.parse(options.body).messages[0].content.startsWith('You are an evidence reviewer')) return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ approved: ['s_b3'] }) } }], model: 'fixture' }) };
      // First reply is malformed: the production schema must force a retry.
      const content = calls === 1 ? { suggestions: 'wrong' } : {
        job: { title: 'Product Designer', company: 'Acme' }, requirements: [],
        suggestions: [
          { target: 's_b1', text: 'Reduced drop-off by 90%.', reason: 'Fabricated metric must be rejected.' },
          { target: 's_b3', text: 'Conduct fortnightly usability sessions with small-business owners.', reason: 'Clarifies the research activity.' },
          { target: 'nonexistent', text: 'Invalid target', reason: 'Must be rejected.' },
        ], skills: { order: [], add: [] },
      };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }], model: 'fixture' }) };
    };
    const { result } = await tailor(structuredClone(SAMPLE_CONTENT), cases[0][1], {});
    assert.equal(calls, 3, 'Malformed response must retry, then evidence review must run');
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].targetId, 's_b3');
    console.log('PASS: malformed response retries; fabricated numbers and unknown targets rejected.');
    return;
  }
  for (const [name, description] of cases) {
    const started = Date.now();
    try {
      const { result, usage } = await tailor(structuredClone(SAMPLE_CONTENT), description, {});
      console.log(JSON.stringify({ case: name, seconds: Math.round((Date.now()-started)/1000), model: usage?.model, result }, null, 2));
    } catch (error) { console.log(JSON.stringify({ case: name, error: error.message })); process.exitCode = 1; }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
