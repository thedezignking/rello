import { writeFile } from 'node:fs/promises';
const origin = 'https://userello.vercel.app';
const response = await fetch(`${origin}/?home`, { signal: AbortSignal.timeout(20000) });
const html = await response.text();
const names = ['content-security-policy', 'x-frame-options', 'strict-transport-security', 'referrer-policy', 'permissions-policy', 'x-content-type-options'];
const sources = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => new URL(match[1], origin).href))].filter(url => url.startsWith(`${origin}/_next/`));
const localHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
const localRef = localHost.split('.')[0];
const databaseUrl = process.env.SUPABASE_DB_URL ? new URL(process.env.SUPABASE_DB_URL) : null;
const localDatabaseTargetsSameProject = databaseUrl ? databaseUrl.hostname.includes(localRef) || decodeURIComponent(databaseUrl.username).includes(localRef) : null;
let comparedAssets = 0, matchedLocalHost = false;
for (let index = 0; index < sources.length; index += 4) {
  const texts = await Promise.all(sources.slice(index, index + 4).map(url => fetch(url, { signal: AbortSignal.timeout(20000) }).then(result => result.text())));
  comparedAssets += texts.length;
  if (texts.some(text => text.includes(localHost))) { matchedLocalHost = true; break; }
}
const result = { origin, status: response.status, headers: Object.fromEntries(names.map(name => [name, response.headers.get(name)])), localSupabaseHostEmbeddedInLiveAssets: matchedLocalHost, localDatabaseTargetsSameProject, comparedAssets, note: 'Only public page assets fetched; env values and credentials were not transmitted or recorded.' };
await writeFile(new URL('./http-evidence.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
