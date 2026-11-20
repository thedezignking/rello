import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import "server-only";
import type { BillingSummary, CreditOrder } from "./catalog";
import { BillingError } from "./errors";
import { paymentsEnabled, quotePacks, validatePayment, verifyPayment } from "./paystack";

const PROBLEMS: Record<string, [number, string]> = {
  no_credits: [402, "You’ve used your tailoring credits. Add a pack to tailor another resume."],
  account_required: [403, "Sign in with a verified account to receive your 10 free credits."],
  run_busy: [409, "A resume is already being tailored. Wait for it to finish, then try again."],
  request_failed: [409, "That attempt didn’t finish. Try again; no credit was spent."],
  request_mismatch: [409, "That request changed. Please start a new attempt."],
  run_rate_limit: [429, "You’re making requests quickly. Wait a minute and try again."],
  run_safety_limit: [
    429,
    "Several attempts could not produce useful changes. Try again tomorrow; your credits are safe.",
  ],
  resume_not_found: [404, "We couldn’t find that resume. No credit was spent."],
  resume_changed: [409, "Your resume changed. Please try again with the saved version."],
  run_expired: [409, "That attempt took too long. Your credit will be released automatically."],
  retry_limit: [
    429,
    "You’ve used the 10 AI retries included with this copy. You can still edit it and download it.",
  ],
  retry_not_available: [403, "Create a tailored copy before asking for another suggestion."],
  order_not_found: [404, "We couldn’t find that payment."],
  payment_mismatch: [409, "That payment doesn’t match the order. No credits were added."],
};

export function billingAdmin() {
  const admin = createAdminClient();
  if (!admin)
    throw new BillingError(
      "billing_unavailable",
      "Credit tracking isn’t available right now. Please try again later.",
      503,
    );
  return admin;
}

export async function billingCaller() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error && (!error.status || error.status === 429 || error.status >= 500)) {
    throw new BillingError(
      "auth_unavailable",
      "We couldn’t check your sign-in. Please try refreshing your balance shortly.",
      503,
    );
  }
  if (error || !data.user) throw new BillingError("signed_out", "Sign in to manage your credits.", 401);
  if (data.user.is_anonymous || !data.user.email_confirmed_at)
    throw new BillingError("account_required", PROBLEMS.account_required[1], 403);
  return { user: data.user, admin: billingAdmin() };
}

export async function billingRpc<T>(
  admin: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await admin.rpc(name, args);
  if (error) {
    const entry = Object.entries(PROBLEMS).find(([code]) => error.message === code);
    if (entry) throw new BillingError(entry[0], entry[1][1], entry[1][0]);
    console.error("[billing] database operation failed", name, error.code);
    throw new BillingError("billing_unavailable", "We couldn’t update your credits. Please try again.", 503);
  }
  return data as T;
}

export function inputHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function billingSummary(admin: SupabaseClient, userId: string): Promise<BillingSummary> {
  const account = await billingRpc<Pick<BillingSummary, "available" | "reserved" | "debt">>(
    admin,
    "billing_account",
    { p_user_id: userId },
  );
  const { data, error } = await admin
    .from("credit_orders")
    .select("reference,pack_id,amount,currency,credits,status,created_at,paid_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return {
    ...account,
    quotes: quotePacks(),
    purchasesEnabled: paymentsEnabled(),
    orders: (data ?? []) as CreditOrder[],
  };
}

/** Both the webhook and browser return use this same idempotent fulfillment. */
export async function reconcilePayment(admin: SupabaseClient, reference: string, userId?: string) {
  let query = admin
    .from("credit_orders")
    .select("id,user_id,reference,amount,currency,status")
    .eq("reference", reference);
  if (userId) query = query.eq("user_id", userId);
  const { data: order, error } = await query.maybeSingle();
  if (error) throw error;
  if (!order) throw new BillingError("order_not_found", PROBLEMS.order_not_found[1], 404);
  const payment = await verifyPayment(reference);
  const transactionId = validatePayment(order, payment);
  if (!["success", "reversed"].includes(payment.status)) {
    if (["paid", "reversed"].includes(order.status)) return { status: order.status };
    if (["failed", "abandoned"].includes(payment.status)) {
      const { error } = await admin
        .from("credit_orders")
        .update({ status: "failed" })
        .eq("id", order.id)
        .eq("status", "pending");
      if (error) throw error;
      return { status: "failed" };
    }
    return { status: order.status === "failed" ? "failed" : "pending" };
  }
  return billingRpc<{ status: string }>(admin, "billing_fulfill_order", {
    p_reference: reference,
    p_amount: order.amount,
    p_currency: order.currency,
    p_transaction_id: transactionId,
    p_reversed: payment.status === "reversed",
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new BillingError("forbidden", "That request wasn’t allowed.", 403);
}
