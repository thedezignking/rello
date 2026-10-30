/** False while `.env.local` still has the placeholder values. */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return !!url && !!key && !url.includes("your-project") && !key.includes("replace_me");
}
