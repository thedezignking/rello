import { databaseFetch } from "@/lib/request-budget";
import { createClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Service-role client. Bypasses RLS, so use it only for actions the caller
 * has already been authorised for (e.g. deleting their own account).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    global: { fetch: databaseFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
