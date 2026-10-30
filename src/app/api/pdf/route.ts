import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pdfFilename } from "@/features/pdf/filename";
import { renderPdf } from "@/features/pdf/render";
import { isTemplateId, parseContent, resumeContentSchema, TEMPLATE_IDS } from "@/features/resumes/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return fail(413, "too_large", "That resume is too large to export.");
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Something was wrong with that request.");
  const body = parsed.data;

  let payload;
  let title: string;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return fail(401, "signed_out", "Sign in to download your resume.");
    if (auth.user.is_anonymous) return fail(403, "account_required", "Sign in to download your resume.");

    // RLS limits this to the caller's own resumes.
    const { data: row } = await supabase
      .from("resumes")
      .select("title, template_id, content")
      .eq("id", body.id)
      .maybeSingle();
    if (!row) return fail(404, "not_found", "We couldn't find that resume.");

    payload = {
      templateId: isTemplateId(row.template_id) ? row.template_id : "classic",
      content: parseContent(row.content),
    } as const;
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
    console.error("[pdf] export failed", error);
    return fail(500, "render_failed", "We couldn't prepare your PDF. Your resume is still saved.");
  }
}
