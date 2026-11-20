// Explicit hosted-release smoke test. Creates one fictional account/resume and
// removes them in finally. No email, payment or AI request is made.
import fs from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { SAMPLE_CONTENT } from "../src/features/templates/sample.ts";

if (!process.argv.includes("--write-fixture"))
  throw Error("Use --write-fixture to opt in to the disposable hosted account.");
const origin = "https://userello.vercel.app";
const env = { ...parseEnv(fs.readFileSync(".env.local", "utf8")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (new URL(url).hostname !== "oeiduuohvezojuuzxxog.supabase.co")
  throw Error("Unexpected release database target");
if (!env.SUPABASE_SECRET_KEY) throw Error("Release cleanup requires the service secret");
const admin = createClient(url, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const jar = new Map();
const client = createServerClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (values) => {
      for (const { name, value } of values) jar.set(name, value);
    },
  },
  auth: { autoRefreshToken: false },
});
const marker = randomUUID();
const email = `release-${marker}@example.invalid`;
const password = randomBytes(32).toString("base64url");
let fixtureId;
async function post(path, body) {
  const headers = { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; ") };
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(origin + path, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(65000),
  });
}
try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { release_fixture: marker },
  });
  if (created.error || !created.data.user) throw Error("Couldn't create the disposable release account");
  fixtureId = created.data.user.id;
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || signedIn.data.user?.id !== fixtureId) throw Error("Disposable sign-in failed");
  const { data: resume, error } = await client
    .from("resumes")
    .insert({
      user_id: fixtureId,
      title: `Release smoke ${marker}`,
      template_id: "classic",
      content: SAMPLE_CONTENT,
      schema_version: 1,
    })
    .select("id,revision")
    .single();
  if (error) throw Error(`Disposable resume creation failed (${error.code})`);
  const review = await client.rpc("save_resume_review", {
    p_resume_id: resume.id,
    p_session_id: randomUUID(),
    p_revision: resume.revision,
    p_session_revision: 1,
    p_content: SAMPLE_CONTENT,
    p_choices: {},
  });
  if (review.error || review.data?.ok !== false || review.data?.reason !== "conflict")
    throw Error("Review RPC did not enforce the missing-session guard");
  console.log("Hosted sign-in, owner RLS and atomic-review guard passed.");
  const invalidImport = await post("/api/import", new FormData());
  const problem = await invalidImport.json();
  if (invalidImport.status !== 400 || problem.error?.code !== "no_file")
    throw Error(`Import reservation preflight failed (${invalidImport.status}, ${problem.error?.code})`);
  console.log("Production server authentication and resource reservation passed; no AI call made.");
  const exported = await post("/api/pdf", { id: resume.id });
  if (!exported.ok) {
    const problem = await exported.json().catch(() => null);
    throw Error(`Production PDF failed (${exported.status}, ${problem?.error?.code})`);
  }
  const pdf = Buffer.from(await exported.arrayBuffer());
  if (pdf.subarray(0, 4).toString() !== "%PDF" || pdf.length < 1000) throw Error("Invalid PDF download");
  console.log(`Production PDF export passed (${pdf.length} bytes).`);
} finally {
  await client.auth.signOut({ scope: "global" }).catch(() => {});
  if (fixtureId) {
    const identity = await admin.auth.admin.getUserById(fixtureId);
    if (identity.data.user?.email !== email || identity.data.user.user_metadata?.release_fixture !== marker)
      throw Error("Cleanup ownership check failed");
    const removed = await admin.auth.admin.deleteUser(fixtureId);
    if (removed.error) throw Error("Disposable account cleanup failed");
    const remaining = await admin
      .from("resumes")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", fixtureId);
    if (remaining.error || remaining.count !== 0) throw Error("Disposable resume cleanup failed");
    console.log("Disposable account and resume removed.");
  }
}
