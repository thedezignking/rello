import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tailor } from "@/features/tailor/engine";
import { aiFailure, fail, loadContext, logUsage } from "@/features/tailor/server";

export const maxDuration = 90;

const bodySchema = z.object({
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

  const ctx = await loadContext(body.resumeId, body.content);
  if (!ctx.ok) return ctx.response;

  try {
    const { result, usage } = await tailor(ctx.content, body.description, { title: body.title, company: body.company });
    await logUsage(ctx, "tailor", usage);
    // The person's own title/company win over what the model extracted.
    if (body.title) result.job.title = body.title;
    if (body.company) result.job.company = body.company;
    return NextResponse.json(result);
  } catch (error) {
    await logUsage(ctx, "tailor", null, false);
    return aiFailure(error);
  }
}
