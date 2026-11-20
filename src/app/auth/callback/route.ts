import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Landing point for Google sign-in and for linking Google to a guest account.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // A provider can discover an existing identity only after leaving our UI.
  // Retry as ordinary sign-in once; the separately preserved guest proof is
  // claimed only after Supabase verifies the destination account.
  if (searchParams.get("guest") === "1" && searchParams.get("error_code") === "identity_already_exists") {
    const supabase = await createClient();
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", next);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    if (!error && data.url) return NextResponse.redirect(data.url);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failed = new URL("/", origin);
  failed.searchParams.set("auth", "failed");
  return NextResponse.redirect(failed);
}
