import { authorize, fail, type Caller } from "@/features/ai/guard";
import {
  parseContent,
  resumeContentSchema,
  SCHEMA_VERSION,
  type ResumeContent,
} from "@/features/resumes/schema";
import "server-only";

export { aiFailure, fail, logUsage } from "@/features/ai/guard";

type Ctx =
  ({ ok: true; content: ResumeContent; revision: number } & Caller) | { ok: false; response: Response };

/**
 * Who's asking and which resume. With Supabase the resume is read from the
 * database as the caller (RLS keeps it theirs); in local development the
 * browser sends it, since that's the only place it lives.
 */
export async function loadContext(
  resumeId: string,
  bodyContent: unknown,
  { allowGuest = false, action = "tailor your resume", creditBacked = false } = {},
): Promise<Ctx> {
  const auth = await authorize({ allowGuest, action, creditBacked });
  if (!auth.ok) return auth;
  const { db, userId } = auth.caller;

  if (db) {
    const { data: row, error } = await db
      .from("resumes")
      .select("content,revision,schema_version")
      .eq("id", resumeId)
      .maybeSingle();
    if (error)
      return {
        ok: false,
        response: fail(503, "load_failed", "We couldn't load your resume. Please try again."),
      };
    if (!row) return { ok: false, response: fail(404, "not_found", "We couldn't find that resume.") };
    if (row.schema_version > SCHEMA_VERSION)
      return {
        ok: false,
        response: fail(
          422,
          "invalid_content",
          "This resume uses a newer format. Open it to download a recovery copy.",
        ),
      };
    try {
      const content = parseContent(row.content);
      if (!resumeContentSchema.safeParse(content).success)
        return {
          ok: false,
          response: fail(
            422,
            "invalid_content",
            "Open your resume and shorten the highlighted fields before using AI help.",
          ),
        };
      return { ok: true, content, revision: row.revision, db, userId };
    } catch {
      return {
        ok: false,
        response: fail(
          422,
          "invalid_content",
          "Open this resume to download a recovery copy. Its stored data couldn't be read.",
        ),
      };
    }
  }

  const parsed = resumeContentSchema.safeParse(bodyContent);
  if (parsed.success) return { ok: true, content: parsed.data, revision: 1, db: null, userId: null };
  return { ok: false, response: fail(400, "bad_request", "Something was wrong with that request.") };
}
