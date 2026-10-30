import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, logUsage, aiFailure } from "@/features/ai/guard";
import { IMPROVE_ACTIONS, improveText } from "@/features/ai/improve";
import { loadContext } from "@/features/tailor/server";

export const maxDuration = 60;

const bodySchema = z.object({
  resumeId: z.string().min(1),
  text: z.string().trim().min(3).max(2000),
  action: z.enum(IMPROVE_ACTIONS),
  where: z.string().max(200).default(""),
  content: z.unknown().optional(),
});

/** "Improve with AI" for one field. Returns a suggestion; never edits anything. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Write a little more before asking for help.");
  const body = parsed.data;

  // Loading the resume confirms the caller owns it.
  const ctx = await loadContext(body.resumeId, body.content, { allowGuest: true, action: "use AI writing help" });
  if (!ctx.ok) return ctx.response;

  try {
    const { result, usage } = await improveText(body.text, body.action, body.where);
    await logUsage(ctx, "improve", usage);
    if (!result) return fail(422, "no_safe_rewrite", "This already reads well — we couldn't improve it without adding new facts.");
    return NextResponse.json(result);
  } catch (error) {
    await logUsage(ctx, "improve", null, false);
    return aiFailure(error);
  }
}
