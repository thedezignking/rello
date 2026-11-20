import { reportError } from "@/lib/error-reporting";
import { currentBudget, onRequestFinished, outsideRequestBudget } from "@/lib/request-budget";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import "server-only";
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
  creditBacked = false,
  operation = "improve",
}: {
  allowGuest: boolean;
  action: string;
  creditBacked?: boolean;
  operation?: "import" | "improve" | "pdf";
}): Promise<{ ok: true; caller: Caller } | { ok: false; response: Response }> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") return { ok: true, caller: { db: null, userId: null } };
    return { ok: false, response: fail(500, "not_configured", "This isn't available right now.") };
  }

  const db = await createClient();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError && (!authError.status || authError.status >= 500 || authError.status === 429))
    return {
      ok: false,
      response: fail(503, "auth_unavailable", "We couldn't verify your sign-in. Please try again."),
    };
  if (!auth.user) return { ok: false, response: fail(401, "signed_out", `Sign in to ${action}.`) };
  if (auth.user.is_anonymous && !allowGuest)
    return { ok: false, response: fail(403, "account_required", `Sign in to ${action}.`) };

  if (creditBacked) return { ok: true, caller: { db, userId: auth.user.id } };
  const admin = createAdminClient();
  if (!admin)
    return {
      ok: false,
      response: fail(
        503,
        "usage_unavailable",
        "We couldn't check your resource allowance. Please try again.",
      ),
    };
  const { data: reservation, error } = await admin.rpc("reserve_resource", {
    p_user_id: auth.user.id,
    p_op: operation,
    p_cap: operation === "pdf" ? 200 : Number.isFinite(DAILY_AI_CAP) ? DAILY_AI_CAP : 40,
  });
  if (error)
    return {
      ok: false,
      response: fail(
        error.message.startsWith("resource_") ? 429 : 503,
        "resource_limit",
        error.message === "resource_daily_limit"
          ? "You've reached today's request limit. Try again tomorrow."
          : "Several requests are running or were made recently. Wait a moment and try again.",
      ),
    };
  onRequestFinished(async (ok) => {
    const { error } = await admin.rpc("finish_resource", {
      p_user_id: auth.user.id,
      p_id: reservation,
      p_ok: ok,
    });
    if (error) console.error(JSON.stringify({ event: "resource.finish.failed", code: error.code }));
  });
  return { ok: true, caller: { db, userId: auth.user.id } };
}

export async function logUsage(
  caller: Caller,
  op: string,
  usage: { model: string; inputTokens: number; outputTokens: number } | null,
  ok = true,
) {
  if (!caller.db || !caller.userId) return;
  const attempts = currentBudget()?.usage;
  if (attempts?.length)
    usage = {
      model: attempts
        .map((x) => x.model)
        .filter((x, i, all) => all.indexOf(x) === i)
        .join(","),
      inputTokens: attempts.reduce((n, x) => n + x.inputTokens, 0),
      outputTokens: attempts.reduce((n, x) => n + x.outputTokens, 0),
    };
  const { error } = await outsideRequestBudget(() =>
    caller.db!.from("ai_usage").insert({
      user_id: caller.userId,
      op,
      model: usage?.model ?? null,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      ok,
    }),
  );
  if (error) console.error(JSON.stringify({ event: "ai.usage.failed", code: error.code }));
}

export function aiFailure(error: unknown) {
  if (error instanceof AIError) {
    if (error.code === "rate_limited")
      return fail(503, "busy", "The AI is busy right now. Wait a minute and try again. Nothing was changed.");
    if (error.code === "not_configured")
      return fail(500, "not_configured", "This isn't available right now.");
  }
  reportError(error, "ai");
  return fail(502, "ai_failed", "We couldn't get an answer this time. Try again. Nothing was changed.");
}
