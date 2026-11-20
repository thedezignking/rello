import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingView } from "@/features/billing/billing-view";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Credits & payments", robots: { index: false, follow: false } };

export default function BillingPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<Skeleton className="mx-auto my-12 h-80 w-[min(90%,800px)]" />}>
        <BillingView />
      </Suspense>
      <SiteFooter />
    </>
  );
}
