import { BillingError, billingFailure } from "@/features/billing/errors";
import { initializePayment, paymentOrigin, paymentsEnabled, quotePacks } from "@/features/billing/paystack";
import { billingCaller, sameOrigin } from "@/features/billing/server";
import { readJSON } from "@/lib/request-body";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  packId: z.enum(["starter", "job_search"]),
  currency: z.enum(["USD", "NGN"]).default("USD"),
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user, admin } = await billingCaller();
    if (!paymentsEnabled())
      throw new BillingError(
        "payments_unavailable",
        "Payments aren’t available yet. You can use your free sign-in credits.",
        503,
      );
    const parsed = schema.safeParse(await readJSON(request, 4096));
    if (!parsed.success) throw new BillingError("bad_pack", "Choose a valid credit pack and currency.");
    const quote = quotePacks().find(
      (item) => item.id === parsed.data.packId && item.currency === parsed.data.currency,
    );
    if (!quote)
      throw new BillingError("currency_unavailable", "That checkout currency isn’t available right now.");
    const origin = paymentOrigin(new URL(request.url).origin);
    const { count, error: countError } = await admin
      .from("credit_orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 5)
      throw new BillingError("checkout_rate_limit", "Wait a minute before starting another checkout.", 429);
    const { data: order, error } = await admin
      .from("credit_orders")
      .insert({
        user_id: user.id,
        reference: `rello_${randomUUID().replaceAll("-", "")}`,
        pack_id: quote.id,
        amount: quote.amount,
        currency: quote.currency,
        credits: quote.credits,
      })
      .select("id,reference,amount,currency,pack_id")
      .single();
    if (error) throw error;
    let url: string;
    try {
      url = await initializePayment(order, user.email!, origin);
    } catch (error) {
      await admin
        .from("credit_orders")
        .update({ status: "failed" })
        .eq("id", order.id)
        .eq("status", "pending");
      throw error;
    }
    return Response.json({ url, reference: order.reference });
  } catch (error) {
    return billingFailure(error);
  }
}
