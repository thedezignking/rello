"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, InfoIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";
import { useBilling } from "./billing-provider";
import { BuyCreditsButton } from "./buy-credits-button";
import { CREDIT_PACKS, formatMoney, type BillingCurrency } from "./catalog";

export function BillingView() {
  const { ready, hasAccount, openSignIn } = useAuth();
  const { summary, loading, refreshing, error, refresh } = useBilling();
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference");
  const [currency, setCurrency] = useState<BillingCurrency>("USD");
  const [payment, setPayment] = useState<{ message: string; busy: boolean } | null>(null);
  const verify = useCallback(async (signal?: AbortSignal) => {
    if (!reference || !hasAccount) return;
    if (signal?.aborted) return;
    setPayment({ message: "Checking your payment with Paystack…", busy: true });
    try {
      const response = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }), signal });
      const data = await response.json();
      if (signal?.aborted) return;
      if (!response.ok) throw new Error(data.error?.message ?? "Couldn’t confirm your payment. Please check again.");
      await refresh();
      const complete = data.status === "paid";
      setPayment({ busy: false, message: complete ? "Payment confirmed. Your credits have been added." : data.status === "reversed" ? "This payment has been reversed." : data.status === "failed" ? "This payment wasn’t completed. No credits were added." : "Your payment is still processing. Check again in a moment; credits are added only after confirmation." });
      if (complete || ["failed", "reversed"].includes(data.status)) router.replace("/settings/billing", { scroll: false });
    } catch (cause) {
      if (!signal?.aborted) setPayment({ busy: false, message: cause instanceof Error ? cause.message : "Couldn’t check your payment. Please try again." });
    }
  }, [reference, hasAccount, refresh, router]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void verify(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [verify]);

  return <main className="page-in mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/settings" />}><ArrowLeftIcon />Settings</Button>
    <div><h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Credits & payments</h1><p className="mt-2 text-muted-foreground">One credit, one tailored resume. No subscriptions.</p></div>
    {payment && <Alert aria-live="polite">{payment.busy ? <Spinner /> : <InfoIcon />}<AlertTitle>Payment status</AlertTitle><AlertDescription>{payment.message}{reference && !payment.busy && <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => void verify()}>Check payment again</Button>}</AlertDescription></Alert>}
    {!ready || hasAccount && loading ? <Skeleton className="h-36 w-full" /> : !hasAccount ? <Card><CardHeader><CardTitle>Start with 10 free credits</CardTitle><CardDescription>Sign in to receive your one-time welcome credits and keep your resumes across devices.</CardDescription></CardHeader><CardFooter><Button onClick={() => openSignIn("Sign in to receive 10 free tailoring credits.")}>Sign in</Button></CardFooter></Card> : <Card><CardHeader><CardTitle>Your balance</CardTitle><CardDescription>Welcome credits are granted once per account. Your credits don’t expire.</CardDescription></CardHeader><CardContent>{summary ? <><p className="text-4xl font-medium tabular-nums">{summary.available}<span className="ml-2 text-base font-normal text-muted-foreground">credits available</span></p>{summary.reserved > 0 && <p className="mt-2 text-sm text-muted-foreground">{summary.reserved} reserved while tailoring. Failed attempts release the reservation.</p>}{summary.debt > 0 && <p className="mt-2 text-sm text-destructive">A reversed purchase left a {summary.debt}-credit adjustment. New credits cover this before becoming available.</p>}</> : <p className="text-sm text-muted-foreground">{error ?? "Your balance isn’t available right now."}</p>}</CardContent><CardFooter><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing && <Spinner data-icon="inline-start" />}{refreshing ? "Refreshing…" : "Refresh balance"}</Button></CardFooter></Card>}
    {error && summary && <Alert><InfoIcon /><AlertTitle>Balance may be out of date</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <section aria-labelledby="credit-packs" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="credit-packs" className="font-heading text-2xl">Add a credit pack</h2>{summary?.quotes.some(q => q.currency === "NGN") && <div role="group" aria-label="Payment currency" className="flex gap-2">{(["USD", "NGN"] as const).map(value => <Button key={value} size="sm" variant={currency === value ? "default" : "outline"} aria-pressed={currency === value} onClick={() => setCurrency(value)}>{value}</Button>)}</div>}</div>
      <div className="grid gap-4 sm:grid-cols-2">{CREDIT_PACKS.map(pack => {
        const quote = summary?.quotes.find(q => q.id === pack.id && q.currency === currency);
        return <Card key={pack.id}><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle>{pack.name}</CardTitle>{pack.id === "job_search" && <Badge variant="secondary">Best value</Badge>}</div><CardDescription>{pack.credits} tailoring credits · one-time payment</CardDescription></CardHeader><CardContent><p className="text-3xl font-medium tabular-nums">{formatMoney(quote?.amount ?? pack.usdMinor, quote?.currency ?? "USD")}<span className="ml-2 text-sm font-normal text-muted-foreground">{quote?.currency ?? "USD"}</span></p><ul className="mt-5 space-y-2 text-sm">{[`${pack.credits} job-specific tailored resumes`, "10 AI retries with each copy", "Edit and re-download without using credits"].map(text => <li key={text} className="flex items-start gap-2"><CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />{text}</li>)}</ul></CardContent><CardFooter><BuyCreditsButton pack={pack.id} currency={quote?.currency ?? "USD"} className="w-full">Get {pack.credits} credits</BuyCreditsButton></CardFooter></Card>;
      })}</div>
      <p className="text-sm text-muted-foreground">Payments are processed securely by Paystack. Failed tailoring attempts don’t spend credits. Importing, editing and downloading remain free.</p>
    </section>
    {hasAccount && <Card><CardHeader><CardTitle>Payment history</CardTitle><CardDescription>Your recent credit pack purchases.</CardDescription></CardHeader><CardContent>{!summary ? <p className="text-muted-foreground">History is unavailable until your balance loads.</p> : !summary.orders.length ? <p className="text-muted-foreground">No purchases yet. Welcome credits are included in your balance.</p> : <ul className="divide-y">{summary.orders.map(order => <li key={order.reference} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"><div><p className="font-medium">{order.credits} credits · {formatMoney(order.amount, order.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()} · {order.reference}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{order.status}</Badge>{order.status === "pending" && <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/settings/billing?reference=${order.reference}`} />}>Check payment</Button>}</div></li>)}</ul>}</CardContent></Card>}
  </main>;
}
