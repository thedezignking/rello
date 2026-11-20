import { readJSON, RequestBodyError } from "@/lib/request-body";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { z } from "zod";

const COOKIE = "rello_guest_transfer";
const fail = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return fail(403, "That request wasn't allowed.");
  let body;
  try {
    body = z
      .object({ action: z.enum(["prepare", "claim"]), guestId: z.string().uuid().optional() })
      .parse(await readJSON(request, 4096));
  } catch (error) {
    return fail(error instanceof RequestBodyError ? error.status : 400, "That request couldn't be read.");
  }
  if (!["prepare", "claim"].includes(body?.action)) return fail(400, "Choose a valid transfer action.");
  const jar = await cookies();
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    return fail(
      error?.status && error.status < 500 ? 401 : 503,
      "We couldn't verify your sign-in. Please try again.",
    );
  if (body.action === "prepare") {
    if (!data.user.is_anonymous) return fail(403, "Only a guest session can prepare a transfer.");
    const { data: auth } = await db.auth.getSession();
    const session = auth.session;
    if (!session || session.user.id !== data.user.id || (session.expires_at ?? 0) - Date.now() / 1000 < 120)
      return fail(409, "Refresh this page to renew your guest session, then sign in again.");
    const { data: rows, error: readError } = await db
      .from("resumes")
      .select(
        "id,title,template_id,content,schema_version,revision,source_resume_id,job_id,created_at,updated_at",
      )
      .eq("user_id", data.user.id);
    if (readError) return fail(503, "We couldn't make a recovery copy of your guest resumes. Try again.");
    jar.set(COOKIE, session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/account/guest-transfer",
      maxAge: Math.floor(Math.min(1800, session.expires_at! - Date.now() / 1000)),
    });
    return Response.json({
      backup: { guestId: data.user.id, resumes: rows ?? [], createdAt: new Date().toISOString() },
    });
  }
  if (data.user.is_anonymous || !data.user.email_confirmed_at)
    return fail(403, "Finish signing in before bringing your guest resumes into this account.");
  if (body.guestId === data.user.id) {
    jar.delete({ name: COOKIE, path: "/api/account/guest-transfer" });
    return Response.json({ transferred: 0 });
  }
  if (!jar.get(COOKIE))
    return fail(409, "Your guest session expired. Download your recovery copy to keep the guest resumes.");
  const admin = createAdminClient();
  if (!admin)
    return fail(503, "Guest recovery is temporarily unavailable. Your recovery copy has been kept.");
  const proof = jar.get(COOKIE)!.value;
  const guest = await admin.auth.getUser(proof);
  if (guest.error || !guest.data.user)
    return fail(409, "Your guest session expired. Download your recovery copy to keep the guest resumes.");
  if (guest.data.user.id === data.user.id) {
    jar.delete({ name: COOKIE, path: "/api/account/guest-transfer" });
    return Response.json({ transferred: 0 });
  }
  if (!guest.data.user.is_anonymous) return fail(403, "That session cannot transfer another account's work.");
  const transfer = await admin.rpc("transfer_guest_work", {
    p_guest_id: guest.data.user.id,
    p_user_id: data.user.id,
  });
  if (transfer.error)
    return fail(
      503,
      "We couldn't finish bringing your guest resumes across. Your recovery copy has been kept; try again.",
    );
  jar.delete({ name: COOKIE, path: "/api/account/guest-transfer" });
  return Response.json({ transferred: transfer.data });
}
