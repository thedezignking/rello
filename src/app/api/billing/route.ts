import { billingFailure } from "@/features/billing/errors";
import { billingCaller, billingSummary } from "@/features/billing/server";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const { user, admin } = await billingCaller();
    return Response.json(await billingSummary(admin, user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return billingFailure(error);
  }
}
