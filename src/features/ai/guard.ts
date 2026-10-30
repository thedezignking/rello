import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AIError } from "./openrouter";

const DAILY_AI_CAP = Number(process.env.DAILY_AI_CAP ?? 40);

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export type Caller = { db: SupabaseClient | null; userId: string | null };

/**
 * Checks who's calling an AI route and that they're under today's cap.
 * Guests (anonymous sessions) pass only when `allowGuest` is set.
 * Without Supabase (local development) everyone passes, uncounted.
 */
export async function authorize({
  allowGuest,
  action,
}: {
  allowGuest: boolean;
  action: string;
}): Promise<{ ok: true; caller: Caller } | { ok: false; response: Response }> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") return { ok: true, caller: { db: null, userId: null } };
    return { ok: false, response: fail(500, "not_configured", "This isn't available right now.") };
  }

  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, response: fail(401, "signed_out", `Sign in to ${action}.`) };
  if (auth.user.is_anonymous && !allowGuest)
    return { ok: false, response: fail(403, "account_required", `Sign in to ${action}.`) };

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("ok", true) // failed calls don't count
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_AI_CAP) {
    return {
      ok: false,
      response: fail(429, "daily_cap", "You've reached today's limit for AI help. Try again tomorrow."),
    };
  }
  return { ok: true, caller: { db, userId: auth.user.id } };
}

export async function logUsage(
  caller: Caller,
  op: string,
  usage: { model: string; inputTokens: number; outputTokens: number } | null,
  ok = true,
) {
  if (!caller.db || !caller.userId) return;
  await caller.db.from("ai_usage").insert({
    user_id: caller.userId,
    op,
    model: usage?.model ?? null,
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    ok,
  });
}

export function aiFailure(error: unknown) {
  if (error instanceof AIError) {
    if (error.code === "rate_limited")
      return fail(503, "busy", "The AI is busy right now. Wait a minute and try again. Nothing was changed.");
    if (error.code === "not_configured") return fail(500, "not_configured", "This isn't available right now.");
  }
  console.error("[ai]", error);
  return fail(502, "ai_failed", "We couldn't get an answer this time. Try again. Nothing was changed.");
}
