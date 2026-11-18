import type { SupabaseClient } from "@supabase/supabase-js";

/** Keep guest upgrades on the same account; existing emails use ordinary OTP. */
export async function requestEmailCode(
  client: SupabaseClient,
  email: string,
  emailRedirectTo: string,
  mode: "guest" | "email" | "resend-link",
) {
  if (mode === "resend-link") {
    const { error } = await client.auth.resend({ type: "email_change", email });
    if (error) throw error;
    return true;
  }
  if (mode === "guest") {
    const { error } = await client.auth.updateUser({ email }, { emailRedirectTo });
    if (!error) return true;
    if (error.code !== "email_exists") throw error;
  }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  });
  if (error) throw error;
  return false;
}

export function isCodeRateLimit(error: unknown) {
  const failure = error as { code?: string; status?: number } | null;
  return failure?.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(failure?.code ?? "");
}

export function emailCodeError(error: unknown, verifying = false) {
  if (isCodeRateLimit(error)) return "Too many code requests. Please wait a few minutes and try again.";
  const failure = error as { code?: string; status?: number } | null;
  if (failure?.code === "otp_expired") return "That code has expired or was already used. Request a new code below.";
  if (failure?.status && failure.status >= 500) return "Email sign-in is temporarily unavailable. Please try again shortly.";
  if (!failure?.status) return "We couldn't connect. Check your connection and try again.";
  return verifying
    ? "That code didn't work. Check the latest email, or request a new code below."
    : "We couldn't send a code. Check the email address and try again.";
}
