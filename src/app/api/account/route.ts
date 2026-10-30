import { NextResponse } from "next/server";
import { fail } from "@/features/ai/guard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Deletes the caller's account and everything in it. Every table references
 * auth.users with ON DELETE CASCADE, so removing the user removes their
 * resumes, jobs, tailoring sessions and usage log too.
 */
export async function DELETE() {
  if (!isSupabaseConfigured()) {
    // Local development keeps data in the browser; the client clears it.
    return NextResponse.json({ ok: true, local: true });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail(401, "signed_out", "Sign in to delete your account.");

  const admin = createAdminClient();
  if (!admin) return fail(500, "not_configured", "Account deletion isn't available right now. Contact support.");

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) {
    console.error("[account] delete failed", error);
    return fail(500, "delete_failed", "We couldn't delete your account. Nothing was removed. Try again.");
  }
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
