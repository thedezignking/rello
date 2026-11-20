import { billingFailure } from "@/features/billing/errors";
import { PAYMENT_REFERENCE, validWebhook } from "@/features/billing/paystack";
import { billingAdmin, reconcilePayment } from "@/features/billing/server";
import { readBytes, RequestBodyError } from "@/lib/request-body";

export async function POST(request: Request) {
  let raw: Buffer;
  try {
    raw = Buffer.from(await readBytes(request, 256000));
  } catch (error) {
    return Response.json(
      { error: "Invalid request" },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  if (raw.length > 256_000 || !validWebhook(raw, request.headers))
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
  if (!["charge.success", "refund.processed", "charge.dispute.resolve"].includes(event.event))
    return Response.json({ received: true });
  const reference = event.data?.reference ?? event.data?.transaction?.reference;
  if (typeof reference !== "string" || !PAYMENT_REFERENCE.test(reference))
    return Response.json({ received: true });
  try {
    await reconcilePayment(billingAdmin(), reference);
    return Response.json({ received: true });
  } catch (error) {
    return billingFailure(error);
  }
}
