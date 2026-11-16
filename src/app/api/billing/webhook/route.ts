import { billingAdmin, reconcilePayment } from "@/features/billing/server";
import { billingFailure } from "@/features/billing/errors";
import { PAYMENT_REFERENCE, validWebhook } from "@/features/billing/paystack";

export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.length > 256_000 || !validWebhook(raw, request.headers)) return Response.json({ error: "Invalid signature" }, { status: 401 });
  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { return Response.json({ error: "Invalid event" }, { status: 400 }); }
  if (!["charge.success", "refund.processed", "charge.dispute.resolve"].includes(event.event)) return Response.json({ received: true });
  const reference = event.data?.reference ?? event.data?.transaction?.reference;
  if (typeof reference !== "string" || !PAYMENT_REFERENCE.test(reference)) return Response.json({ received: true });
  try {
    await reconcilePayment(billingAdmin(), reference);
    return Response.json({ received: true });
  } catch (error) { return billingFailure(error); }
}
