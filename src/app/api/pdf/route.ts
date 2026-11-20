import { authorize } from "@/features/ai/guard";
import { pdfFilename } from "@/features/pdf/filename";
import { renderPdf } from "@/features/pdf/render";
import {
  isTemplateId,
  parseContent,
  resumeContentSchema,
  SCHEMA_VERSION,
  TEMPLATE_IDS,
} from "@/features/resumes/schema";
import { reportError } from "@/lib/error-reporting";
import { readJSON, RequestBodyError } from "@/lib/request-body";
import { withRequestBudget } from "@/lib/request-budget";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

const bodySchema = z.object({
  id: z.string().uuid(),
  // Only read while Supabase isn't configured (local development).
  title: z.string().max(200).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  content: resumeContentSchema.optional(),
});

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function handlePost(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return fail(413, "too_large", "That resume is too large to export.");
  }
  const parsed = bodySchema.safeParse(await readJSON(request));
  if (!parsed.success) return fail(400, "bad_request", "Something was wrong with that request.");
  const body = parsed.data;

  let payload;
  let title: string;

  if (isSupabaseConfigured()) {
    const auth = await authorize({ allowGuest: false, action: "download your resume", operation: "pdf" });
    if (!auth.ok) return auth.response;
    const supabase = auth.caller.db!;

    // RLS limits this to the caller's own resumes.
    const { data: row, error } = await supabase
      .from("resumes")
      .select("title, template_id, content, schema_version")
      .eq("id", body.id)
      .maybeSingle();
    if (error) return fail(503, "load_failed", "We couldn't load your resume. Try again shortly.");
    if (!row) return fail(404, "not_found", "We couldn't find that resume.");
    if (row.schema_version > SCHEMA_VERSION)
      return fail(
        422,
        "invalid_content",
        "This resume uses a newer format. Open it to download a recovery copy.",
      );

    try {
      payload = {
        templateId: isTemplateId(row.template_id) ? row.template_id : "classic",
        content: parseContent(row.content),
      } as const;
    } catch {
      return fail(
        422,
        "invalid_content",
        "Open this resume to download a recovery copy. Its stored data couldn't be read.",
      );
    }
    title = row.title;
  } else if (process.env.NODE_ENV !== "production" && body.content && body.templateId) {
    payload = { templateId: body.templateId, content: body.content };
    title = body.title ?? "";
  } else {
    return fail(500, "not_configured", "Downloads aren't available right now.");
  }

  try {
    const origin = process.env.PDF_RENDER_ORIGIN ?? request.nextUrl.origin;
    const pdf = await renderPdf(origin, payload);
    const filename = pdfFilename(payload.content.personal.name, title);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    reportError(error, "pdf");
    return fail(500, "render_failed", "We couldn't prepare your PDF. Your resume is still saved.");
  }
}

export function POST(request: NextRequest) {
  return withRequestBudget(request, 50000, async () => {
    try {
      return await handlePost(request);
    } catch (error) {
      if (error instanceof RequestBodyError)
        return Response.json(
          { error: { code: "bad_request", message: error.message } },
          { status: error.status },
        );
      throw error;
    }
  });
}
