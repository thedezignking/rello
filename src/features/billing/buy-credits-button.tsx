"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import type { BillingCurrency, PackId } from "./catalog";

export function BuyCreditsButton({
  pack,
  currency = "USD",
  children,
  ...props
}: {
  pack: PackId;
  currency?: BillingCurrency;
  children: React.ReactNode;
} & Pick<React.ComponentProps<typeof Button>, "className" | "variant">) {
  const { requireAccount } = useAuth();
  const [busy, setBusy] = useState(false);
  async function purchase() {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await requireAccount("Sign in to receive 10 free tailoring credits and add a credit pack.")))
        return;
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack, currency }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Couldn’t open checkout. Please try again.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com")
        throw new Error("Couldn’t open checkout.");
      window.location.assign(url.href);
    } catch (error) {
      toast.add({
        title: "Checkout unavailable",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button {...props} disabled={busy} onClick={purchase}>
      {busy ? <Spinner /> : null}
      {busy ? "Opening checkout…" : children}
      {!busy && <ArrowRightIcon data-icon="inline-end" />}
    </Button>
  );
}
