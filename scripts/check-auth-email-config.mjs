import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = (await readFile(new URL("./auth-emails.mjs", import.meta.url), "utf8")).replace('import fs from "node:fs";', "");
async function configure(sender) {
  let patch;
  const current = { uri_allow_list: "https://existing.example/auth/callback" };
  await runInNewContext(`(async () => {${source}\n})()`, {
    URL,
    console: { log() {}, error() {} },
    process: { argv: ["node", "auth-emails", "--site-url=https://rello.example"] },
    fs: { readFileSync: () => [
      "SUPABASE_ACCESS_TOKEN=fixture",
      "NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co",
      "RESEND_API_KEY=fixture",
      `SMTP_FROM=${sender}`,
    ].join("\n") },
    fetch: async (url, options = {}) => {
      if (url === "https://api.resend.com/domains") return { ok: true, json: async () => ({ data: [{ name: "rello.example", status: "verified" }] }) };
      if (options.method === "PATCH") patch = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ...current, ...patch }) };
    },
  });
  return patch;
}
const patch = await configure("Rello <hello@rello.example>");
assert.equal(patch.smtp_admin_email, "hello@rello.example", "SMTP gets the address rather than a display-name header");
assert.equal(patch.mailer_otp_length, 6);
assert.equal(patch.rate_limit_email_sent, 30, "custom SMTP does not retain the unusable two-email limit");
assert.equal(patch.smtp_max_frequency, 60, "per-recipient throttling remains enabled");
assert.equal(patch.site_url, "https://rello.example");
assert.ok(patch.uri_allow_list.includes("https://existing.example/auth/callback"), "existing redirects survive configuration");
assert.ok(patch.uri_allow_list.includes("https://rello.example/auth/callback"), "live callback is allowed");
await assert.rejects(configure("onboarding@resend.dev"), /verified sending domain/);
await assert.rejects(configure("hello@unverified.example"), /must be verified/);
console.log("Auth email configuration checks passed: verified sender, code length, rate limits, and preserved redirects.");
