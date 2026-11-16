import { z } from "zod";
import { billingCaller, reconcilePayment, sameOrigin } from "@/features/billing/server";
import { BillingError, billingFailure } from "@/features/billing/errors";
import { PAYMENT_REFERENCE } from "@/features/billing/paystack";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user, admin } = await billingCaller();
    const parsed = z.object({ reference: z.string().regex(PAYMENT_REFERENCE) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new BillingError("invalid_reference", "That payment reference is invalid.");
    return Response.json(await reconcilePayment(admin, parsed.data.reference, user.id));
  } catch (error) { return billingFailure(error); }
}
