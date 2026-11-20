import { BillingError, billingFailure } from "@/features/billing/errors";
import { PAYMENT_REFERENCE } from "@/features/billing/paystack";
import { billingCaller, reconcilePayment, sameOrigin } from "@/features/billing/server";
import { readJSON } from "@/lib/request-body";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user, admin } = await billingCaller();
    const parsed = z
      .object({ reference: z.string().regex(PAYMENT_REFERENCE) })
      .safeParse(await readJSON(request, 4096));
    if (!parsed.success) throw new BillingError("invalid_reference", "That payment reference is invalid.");
    return Response.json(await reconcilePayment(admin, parsed.data.reference, user.id));
  } catch (error) {
    return billingFailure(error);
  }
}
