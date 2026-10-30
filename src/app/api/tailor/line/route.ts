import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resuggest } from "@/features/tailor/engine";
import { aiFailure, fail, loadContext, logUsage } from "@/features/tailor/server";

export const maxDuration = 60;

const bodySchema = z.object({
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

  const ctx = await loadContext(body.resumeId, body.content);
  if (!ctx.ok) return ctx.response;

  try {
    const out = await resuggest(ctx.content, body.description, body.targetId, body.previous, body.nudge);
    await logUsage(ctx, "resuggest", out?.usage ?? null);
    if (!out) return fail(404, "line_gone", "That line isn't in the resume anymore.");
    if (!out.suggestion) {
      return fail(422, "no_safe_rewrite", "We couldn't find a better way to say this without adding new facts.");
    }
    return NextResponse.json(out.suggestion);
  } catch (error) {
    await logUsage(ctx, "resuggest", null, false);
    return aiFailure(error);
  }
}
