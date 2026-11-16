export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export function billingFailure(error: unknown) {
  if (error instanceof BillingError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  console.error("[billing]", error instanceof Error ? error.message : "Unexpected failure");
  return Response.json({ error: { code: "billing_failed", message: "We couldn’t update your credits. Please try again." } }, { status: 503 });
}
