export const SIGN_IN_CREDITS = 10;
export const INCLUDED_RETRIES = 10;
export const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 5, usdMinor: 200 },
  { id: "job_search", name: "Job search pack", credits: 20, usdMinor: 500 },
] as const;
export type PackId = (typeof CREDIT_PACKS)[number]["id"];
export type BillingCurrency = "USD" | "NGN";
export type PackQuote = {
  id: PackId;
  name: string;
  credits: number;
  amount: number;
  currency: BillingCurrency;
};
export type CreditOrder = {
  reference: string;
  pack_id: PackId;
  amount: number;
  currency: BillingCurrency;
  credits: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};
export type BillingSummary = {
  available: number;
  reserved: number;
  debt: number;
  purchasesEnabled: boolean;
  quotes: PackQuote[];
  orders: CreditOrder[];
};

export function formatMoney(amount: number, currency: BillingCurrency) {
  return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(
    amount / 100,
  );
}
