import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tailor } from "@/features/tailor/engine";
import { aiFailure, fail, loadContext, logUsage } from "@/features/tailor/server";
import { aiConfigured } from "@/features/ai/openrouter";
import { billingAdmin, billingRpc, inputHash } from "@/features/billing/server";
import { BillingError, billingFailure } from "@/features/billing/errors";
import { parseContent } from "@/features/resumes/schema";
import type { TailorResult } from "@/features/tailor/types";

export const maxDuration = 90;

const bodySchema = z.object({
  requestId: z.string().uuid().default(() => crypto.randomUUID()),
  resumeId: z.string().min(1),
  description: z.string().trim().min(80, "short").max(15000, "long"),
  title: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  content: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "description") {
      return fail(
        400,
        "bad_description",
        issue.message === "long"
          ? "That job description is very long. Paste just the role, responsibilities and requirements."
          : "Paste the full job description. This looks too short to work from.",
      );
    }
    return fail(400, "bad_request", "Something was wrong with that request.");
  }
  const body = parsed.data;

  const ctx = await loadContext(body.resumeId, body.content, { creditBacked: true });
  if (!ctx.ok) return ctx.response;
  if (ctx.db && !aiConfigured()) return fail(503, "not_configured", "AI isn’t available right now. No credit was spent.");

  let runId: string | null = null;
  try {
    let content = ctx.content;
    if (ctx.db && ctx.userId) {
      const start = await billingRpc<{ kind: string; run_id: string; resume_id?: string; result?: TailorResult; charged?: boolean; content?: unknown }>(billingAdmin(), "billing_start_tailoring", {
        p_user_id: ctx.userId, p_request_id: body.requestId, p_source_id: body.resumeId, p_revision: ctx.revision,
        p_hash: inputHash({ resumeId: body.resumeId, revision: ctx.revision, content, description: body.description, title: body.title ?? "", company: body.company ?? "" }),
        p_description: body.description, p_title: body.title ?? "", p_company: body.company ?? "",
      });
      if (start.kind === "ready") return NextResponse.json({ ...start.result, resumeId: start.resume_id, creditCharged: start.charged });
      if (start.kind === "running") return fail(409, "in_progress", "That resume is still being tailored. Wait a moment and try again; your credit is reserved.");
      runId = start.run_id;
      content = parseContent(start.content);
    }
    const { result, usage } = await tailor(content, body.description, { title: body.title, company: body.company });
    await logUsage(ctx, "tailor", usage);
    // The person's own title/company win over what the model extracted.
    if (body.title) result.job.title = body.title;
    if (body.company) result.job.company = body.company;
    if (runId && ctx.userId) {
      const saved = await billingRpc<{ resume_id: string; charged: boolean }>(billingAdmin(), "billing_finish_tailoring", { p_user_id: ctx.userId, p_run_id: runId, p_result: result });
      return NextResponse.json({ ...result, resumeId: saved.resume_id, creditCharged: saved.charged });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (runId && ctx.userId) {
      await billingRpc(billingAdmin(), "billing_release_tailoring", { p_user_id: ctx.userId, p_run_id: runId }).catch(() => console.error("[billing] Credit hold will be released on expiry", runId));
    }
    await logUsage(ctx, "tailor", null, false);
    if (error instanceof BillingError) return billingFailure(error);
    return aiFailure(error);
  }
}
