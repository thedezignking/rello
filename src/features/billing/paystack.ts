import { createHmac, timingSafeEqual } from "node:crypto";
import "server-only";
import { CREDIT_PACKS, type BillingCurrency, type PackId, type PackQuote } from "./catalog";
import { BillingError } from "./billing-error";

export const PAYMENT_REFERENCE = /^rello_[a-f0-9]{32}$/;

export function quotePacks(env: NodeJS.ProcessEnv = process.env): PackQuote[] {
  const quotes: PackQuote[] = CREDIT_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    credits: pack.credits,
    amount: pack.usdMinor,
    currency: "USD",
  }));
  const rate = Number(env.PAYSTACK_NGN_PER_USD);
  if (Number.isFinite(rate) && rate > 0 && rate <= 1_000_000) {
    for (const pack of CREDIT_PACKS) {
      const amount = Math.round(pack.usdMinor * rate);
      if (Number.isSafeInteger(amount) && amount > 0)
        quotes.push({ id: pack.id, name: pack.name, credits: pack.credits, amount, currency: "NGN" });
    }
  }
  return quotes;
}

export function paymentOrigin(requestOrigin?: string) {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV !== "production" ? requestOrigin : undefined);
  if (!value)
    throw new BillingError(
      "payments_unavailable",
      "Payments aren’t available yet. Your free credits are still available.",
      503,
    );
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    !(url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:"))
  )
    throw new BillingError("payments_unavailable", "Payments aren’t available right now.", 503);
  return url.origin;
}

export function paymentsEnabled() {
  return (
    /^sk_(live|test)_/.test(process.env.PAYSTACK_SECRET_KEY ?? "") &&
    Boolean(process.env.NEXT_PUBLIC_SITE_URL || process.env.NODE_ENV !== "production")
  );
}

async function paystack(path: string, body?: object) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key)
    throw new BillingError(
      "payments_unavailable",
      "Payments aren’t available yet. Your free credits are still available.",
      503,
    );
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result.data)
    throw new BillingError(
      "payment_service",
      "Paystack couldn’t complete that request. Please try again.",
      502,
    );
  return result.data;
}

export async function initializePayment(
  order: { id: string; reference: string; amount: number; currency: BillingCurrency; pack_id: PackId },
  email: string,
  origin: string,
) {
  const data = await paystack("/transaction/initialize", {
    email,
    amount: order.amount,
    currency: order.currency,
    reference: order.reference,
    callback_url: `${origin}/settings/billing?reference=${encodeURIComponent(order.reference)}`,
    metadata: { rello_order_id: order.id, pack_id: order.pack_id },
  });
  const url = new URL(data.authorization_url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com")
    throw new BillingError("payment_service", "Paystack returned an invalid checkout link.", 502);
  return url.href;
}

export async function verifyPayment(reference: string) {
  if (!PAYMENT_REFERENCE.test(reference))
    throw new BillingError("invalid_reference", "That payment reference is invalid.");
  return paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function validatePayment(
  order: { id: string; reference: string; amount: number; currency: string; status: string },
  payment: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
) {
  const metadata = payment.metadata as Record<string, unknown> | null;
  const validId =
    (typeof payment.id === "string" && /^[1-9]\d*$/.test(payment.id)) ||
    (typeof payment.id === "number" && Number.isSafeInteger(payment.id) && payment.id > 0);
  if (
    !validId ||
    payment.reference !== order.reference ||
    payment.amount !== order.amount ||
    payment.currency !== order.currency ||
    metadata?.rello_order_id !== order.id ||
    payment.domain !== (env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test")
  ) {
    throw new BillingError(
      "payment_mismatch",
      "That payment doesn’t match this order. No credits were added.",
      409,
    );
  }
  return String(payment.id);
}

function equalSignature(value: string, expected: Buffer) {
  return /^[a-f0-9]{128}$/i.test(value) && timingSafeEqual(Buffer.from(value, "hex"), expected);
}

/** Supports current timestamped signatures and Paystack's legacy header. */
export function validWebhook(
  raw: Buffer,
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
  now = Math.floor(Date.now() / 1000),
) {
  const signature = headers.get("paystack-signature");
  if (signature) {
    if (!env.PAYSTACK_WEBHOOK_SECRET) return false;
    const fields = signature.split(",").map((part) => part.trim().split("="));
    const timestamps = fields.filter(([key]) => key === "t");
    if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] ?? "")) return false;
    const timestamp = timestamps[0][1];
    if (Math.abs(now - Number(timestamp)) > 300) return false;
    const expected = createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET)
      .update(`${timestamp}.`)
      .update(raw)
      .digest();
    return fields.some(
      ([key, value]) =>
        key === "v1" &&
        /^whk_[^:]+:/.test(value ?? "") &&
        equalSignature(value.slice(value.indexOf(":") + 1), expected),
    );
  }
  const legacy = headers.get("x-paystack-signature");
  return Boolean(
    legacy &&
    env.PAYSTACK_SECRET_KEY &&
    equalSignature(legacy, createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(raw).digest()),
  );
}
