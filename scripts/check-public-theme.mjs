import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Inspect the initial HTML as well as the theme script: script-only checks
// miss the browser's background before that script has had a chance to run.
const origin = new URL(process.argv[2] ?? "http://localhost:3000");
assert.ok(["http:", "https:"].includes(origin.protocol));
const publicPaths = ["/?home", "/privacy", "/terms", "/guide"];
await Promise.all(publicPaths.map(async (path) => {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, `${path}: page loads`);
  const html = await response.text();
  const openingHtml = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  assert.match(openingHtml, /data-theme="light"/, `${path}: server declares a light default`);
  assert.match(openingHtml, /color-scheme:only light/, `${path}: native surfaces start light`);
  assert.match(openingHtml, /background-color:#f8f9f6/, `${path}: canvas starts in the public page color`);
}));

const manifestResponse = await fetch(new URL("/manifest.webmanifest", origin));
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.background_color.toLowerCase(), "#f8f9f6", "installed app startup background is light");
assert.equal(manifest.theme_color.toLowerCase(), "#f8f9f6", "installed app startup chrome is light");

const source = await readFile(new URL("../src/features/theme/script.ts", import.meta.url), "utf8");
const moduleContext = { exports: {} };
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, moduleContext);
const { themeScript, THEME_EVENT } = moduleContext.exports;

function boot(path, choice, systemDark, blockedStorage = false) {
  const root = { dataset: { theme: "light" }, style: { colorScheme: "only light", backgroundColor: "#f8f9f6" } };
  const events = new Map();
  const location = { pathname: path };
  const media = { matches: systemDark, addEventListener: (_, listener) => events.set("system", listener) };
  runInNewContext(themeScript, {
    document: { documentElement: root }, location,
    localStorage: { getItem() { if (blockedStorage) throw Error("Storage blocked"); return choice; } },
    matchMedia: () => media,
    addEventListener: (name, listener) => events.set(name, listener),
  }, { timeout: 1000 });
  return { root, events, location, media };
}

for (const path of ["/", "/privacy", "/terms", "/guide"]) {
  const { root } = boot(path, "dark", true);
  assert.equal(root.dataset.theme, "light", `${path}: saved dark preference does not darken public pages`);
  assert.equal(root.style.colorScheme, "only light");
  assert.equal(root.style.backgroundColor, "#f8f9f6");
}

const app = boot("/resumes", "dark", false);
assert.equal(app.root.dataset.theme, "dark", "app keeps the saved dark preference");
assert.equal(app.root.style.colorScheme, "dark");
assert.equal(app.root.style.backgroundColor, "", "public canvas override is cleared in the app");
app.location.pathname = "/privacy";
app.events.get(THEME_EVENT)();
assert.equal(app.root.dataset.theme, "light", "returning to public pages restores light");
app.location.pathname = "/r/example";
app.events.get(THEME_EVENT)();
assert.equal(app.root.dataset.theme, "dark", "returning to the editor restores dark");
assert.equal(app.root.dataset.publicPage, undefined);

const system = boot("/settings", "system", false);
system.media.matches = true;
system.events.get("system")();
assert.equal(system.root.dataset.theme, "dark", "app follows system preference changes");
const publicSystem = boot("/guide", "system", false);
publicSystem.media.matches = true;
publicSystem.events.get("system")();
assert.equal(publicSystem.root.dataset.theme, "light", "public pages stay light on system changes");
assert.equal(boot("/", null, true, true).root.style.colorScheme, "only light", "blocked storage keeps the light public fallback");

console.log("Public theme checks passed: server HTML, manifest, saved preferences, navigation, and system changes.");
