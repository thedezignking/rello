import { BillingError } from "./billing-error";
export { BillingError } from "./billing-error";

export function billingFailure(error: unknown) {
  if (!(error instanceof BillingError) || error.status >= 500) reportError(error, "billing");
  if (error instanceof RequestBodyError)
    return Response.json(
      { error: { code: "bad_request", message: error.message } },
      { status: error.status },
    );
  if (error instanceof BillingError)
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  console.error(JSON.stringify({ event: "billing.failed" }));
  return Response.json(
    { error: { code: "billing_failed", message: "We couldn’t update your credits. Please try again." } },
    { status: 503 },
  );
}
import { RequestBodyError } from "@/lib/request-body";
import { reportError } from "@/lib/error-reporting";
