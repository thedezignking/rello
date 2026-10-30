import { NextResponse, type NextRequest } from "next/server";
import { aiFailure, authorize, fail, logUsage } from "@/features/ai/guard";
import { extractText, parseResume, sniff } from "@/features/import/parse";

export const maxDuration = 90;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 20_000;
const UNREADABLE = "We couldn't read this file. Try a text-based PDF or DOCX.";

/**
 * Reads an uploaded resume and returns its contents as fields for the person
 * to check. Nothing is saved here, and the file itself isn't kept.
 */
export async function POST(request: NextRequest) {
  const auth = await authorize({ allowGuest: true, action: "import a resume" });
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "no_file", "Choose a PDF or DOCX file to import.");
  if (file.size > MAX_BYTES) return fail(413, "too_large", "That file is over 5 MB. Try a smaller PDF or DOCX.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail(415, "wrong_type", "Only PDF and DOCX files can be imported.");

  let text: string;
  try {
    text = (await extractText(bytes, kind)).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return fail(422, "unreadable", UNREADABLE);
  }
  // Scanned or image-only files have little or no text layer.
  if (text.length < 80) {
    return fail(
      422,
      "no_text",
      kind === "pdf"
        ? "This PDF looks like a scan or image, so there's no text to read. Try a text-based PDF or DOCX."
        : UNREADABLE,
    );
  }

  try {
    const { content, usage, sample } = await parseResume(text.slice(0, MAX_TEXT));
    await logUsage(auth.caller, "import", usage);
    return NextResponse.json({ content, sample, truncated: text.length > MAX_TEXT, fileName: file.name });
  } catch (error) {
    await logUsage(auth.caller, "import", null, false);
    return aiFailure(error);
  }
}
