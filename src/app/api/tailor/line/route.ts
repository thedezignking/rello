import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resuggest } from "@/features/tailor/engine";
import { aiFailure, fail, loadContext, logUsage } from "@/features/tailor/server";
import { billingAdmin, billingRpc, inputHash } from "@/features/billing/server";
import { BillingError, billingFailure } from "@/features/billing/errors";
import { aiConfigured } from "@/features/ai/openrouter";

export const maxDuration = 60;

const bodySchema = z.object({
  requestId: z.string().uuid().default(() => crypto.randomUUID()),
  resumeId: z.string().min(1),
  description: z.string().trim().min(1).max(15000),
  targetId: z.string().min(1).max(100),
  previous: z.string().max(4000).default(""),
  nudge: z.string().trim().max(200).default(""),
  content: z.unknown().optional(),
});

/** "Try again" for a single line. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Something was wrong with that request.");
  const body = parsed.data;

  const ctx = await loadContext(body.resumeId, body.content, { creditBacked: true });
  if (!ctx.ok) return ctx.response;
  if (ctx.db && !aiConfigured()) return fail(503, "not_configured", "AI isn’t available right now. No retry was used.");

  let reserved = false;
  try {
    let description = body.description;
    if (ctx.db && ctx.userId) {
      const { data: session, error } = await ctx.db.from("tailor_sessions").select("job_id").eq("resume_id", body.resumeId).eq("user_id", ctx.userId).maybeSingle();
      if (error) throw error;
      if (!session) throw new BillingError("retry_not_available", "Create a tailored copy before asking for another suggestion.", 403);
      const { data: job, error: jobError } = await ctx.db.from("jobs").select("description").eq("id", session.job_id).eq("user_id", ctx.userId).single();
      if (jobError) throw jobError;
      description = job.description;
      const start = await billingRpc<{ kind: string; result?: { text: string; reason: string } }>(billingAdmin(), "billing_start_retry", {
        p_user_id: ctx.userId, p_request_id: body.requestId, p_resume_id: body.resumeId,
        p_hash: inputHash({ resumeId: body.resumeId, target: body.targetId, previous: body.previous, nudge: body.nudge, content: ctx.content, description }),
      });
      if (start.kind === "ready") return NextResponse.json(start.result);
      if (start.kind === "running") return fail(409, "in_progress", "That suggestion is still being prepared. Try again in a moment.");
      reserved = true;
    }
    const out = await resuggest(ctx.content, description, body.targetId, body.previous, body.nudge);
    await logUsage(ctx, "resuggest", out?.usage ?? null);
    if (reserved && ctx.userId) {
      const saved = await billingRpc<{ text: string; reason: string } | null>(billingAdmin(), "billing_finish_retry", { p_user_id: ctx.userId, p_request_id: body.requestId, p_result: out?.suggestion ?? null });
      reserved = false;
      if (!saved) return fail(422, "no_safe_rewrite", "We couldn’t find a better wording without adding new facts. No retry was used.");
      return NextResponse.json(saved);
    }
    if (!out?.suggestion) {
      return fail(422, "no_safe_rewrite", "We couldn't find a better way to say this without adding new facts.");
    }
    return NextResponse.json(out.suggestion);
  } catch (error) {
    if (reserved && ctx.userId) await billingRpc(billingAdmin(), "billing_finish_retry", { p_user_id: ctx.userId, p_request_id: body.requestId, p_result: null }).catch(() => console.error("[billing] Retry hold will expire", body.requestId));
    await logUsage(ctx, "resuggest", null, false);
    if (error instanceof BillingError) return billingFailure(error);
    return aiFailure(error);
  }
}
