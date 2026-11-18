import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

class BillingError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}
let authResult;
const admin = {};
const context = {
  exports: {},
  require(name) {
    if (name === "server-only" || name === "node:crypto" || name === "./paystack") return {};
    if (name === "./errors") return { BillingError };
    if (name.endsWith("/supabase/server")) return { createClient: async () => ({ auth: { getUser: async () => authResult } }) };
    if (name.endsWith("/supabase/admin")) return { createAdminClient: () => admin };
    throw new Error(`Unexpected import ${name}`);
  },
};
const source = await readFile(new URL("../src/features/billing/server.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { billingCaller } = context.exports;
for (const error of [{ status: 0 }, { status: 503 }, { status: 429 }]) {
  authResult = { data: { user: null }, error };
  await assert.rejects(billingCaller(), (e) => e.status === 503 && e.code === "auth_unavailable", "network or service failures are not sign-out errors");
}
authResult = { data: { user: null }, error: null };
await assert.rejects(billingCaller(), (e) => e.status === 401 && e.code === "signed_out");
authResult = { data: { user: { is_anonymous: true } }, error: null };
await assert.rejects(billingCaller(), (e) => e.status === 403 && e.code === "account_required");
const user = { id: "fixture", is_anonymous: false, email_confirmed_at: "2026-11-18T00:00:00Z" };
authResult = { data: { user }, error: null };
const caller = await billingCaller();
assert.equal(caller.user, user);
assert.equal(caller.admin, admin);
console.log("Billing auth checks passed: connection failures, signed-out users, guest restrictions, and verified accounts.");
