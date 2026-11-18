import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/features/auth/email-code.ts", import.meta.url), "utf8");
const context = { exports: {} };
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { requestEmailCode, emailCodeError, isCodeRateLimit } = context.exports;
const email = "test@example.invalid";
const redirect = "https://rello.example/auth/callback";

function client(errors = {}) {
  const calls = [];
  const auth = Object.fromEntries(["updateUser", "signInWithOtp", "resend"].map((name) => [name, async (...args) => {
    calls.push({ name, args });
    return { error: errors[name] ?? null };
  }]));
  return { auth, calls };
}

const guest = client();
assert.equal(await requestEmailCode(guest, email, redirect, "guest"), true);
assert.deepEqual(guest.calls.map((call) => call.name), ["updateUser"], "guest upgrade preserves account ownership");
const existing = client({ updateUser: { code: "email_exists" } });
assert.equal(await requestEmailCode(existing, email, redirect, "guest"), false);
assert.deepEqual(existing.calls.map((call) => call.name), ["updateUser", "signInWithOtp"], "existing account falls back to email sign-in");
const unavailable = { code: "unexpected_failure", status: 500 };
const blocked = client({ updateUser: unavailable });
await assert.rejects(requestEmailCode(blocked, email, redirect, "guest"), (error) => error === unavailable);
assert.equal(blocked.calls.length, 1, "delivery failures cannot fall through and send twice");
const resendLink = client();
assert.equal(await requestEmailCode(resendLink, email, redirect, "resend-link"), true);
assert.equal(resendLink.calls[0].name, "resend");
assert.equal(resendLink.calls[0].args[0].type, "email_change", "guest retries use the matching email-change code");
const ordinary = client();
assert.equal(await requestEmailCode(ordinary, email, redirect, "email"), false);
assert.equal(ordinary.calls[0].name, "signInWithOtp");
assert.equal(ordinary.calls[0].args[0].options.emailRedirectTo, redirect);
assert.equal(isCodeRateLimit({ status: 429 }), true);
assert.equal(isCodeRateLimit({ code: "over_email_send_rate_limit" }), true);
assert.match(emailCodeError({ status: 429 }), /wait/i);
assert.match(emailCodeError({ status: 403, code: "otp_expired" }, true), /new code/i);
assert.match(emailCodeError(unavailable), /temporarily unavailable/i);
assert.match(emailCodeError(new TypeError("fetch failed")), /connection/i);
console.log("Email code checks passed: guest upgrades, existing accounts, resend types, delivery failures, and actionable errors.");
