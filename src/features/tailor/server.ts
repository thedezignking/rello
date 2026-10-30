import "server-only";
import { authorize, fail, type Caller } from "@/features/ai/guard";
import { parseContent, resumeContentSchema, type ResumeContent } from "@/features/resumes/schema";

export { aiFailure, fail, logUsage } from "@/features/ai/guard";

type Ctx = ({ ok: true; content: ResumeContent } & Caller) | { ok: false; response: Response };

/**
 * Who's asking and which resume. With Supabase the resume is read from the
 * database as the caller (RLS keeps it theirs); in local development the
 * browser sends it, since that's the only place it lives.
 */
export async function loadContext(
  resumeId: string,
  bodyContent: unknown,
  { allowGuest = false, action = "tailor your resume" } = {},
): Promise<Ctx> {
  const auth = await authorize({ allowGuest, action });
  if (!auth.ok) return auth;
  const { db, userId } = auth.caller;

  if (db) {
    const { data: row } = await db.from("resumes").select("content").eq("id", resumeId).maybeSingle();
    if (!row) return { ok: false, response: fail(404, "not_found", "We couldn't find that resume.") };
    return { ok: true, content: parseContent(row.content), db, userId };
  }

  const parsed = resumeContentSchema.safeParse(bodyContent);
  if (parsed.success) return { ok: true, content: parsed.data, db: null, userId: null };
  return { ok: false, response: fail(400, "bad_request", "Something was wrong with that request.") };
}
