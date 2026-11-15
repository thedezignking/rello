"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const PLANS = [
  { name: "Free", description: "Start with a resume that feels like you.", price: 0, unit: "free", note: "No card required", action: "Start for free", features: ["Create and edit your resumes", "All four resume templates", "PDF and Word import", "PDF downloads", "Try AI writing and job tailoring"] },
  { name: "Starter", description: "A little extra help for your next few applications.", price: 2, unit: "one time", note: "5 tailoring credits", action: "Get 5 credits", features: ["Everything in Free", "5 job-specific tailored resumes", "Line-by-line AI suggestions", "Accept, keep original, or retry", "Download your saved copies again"] },
  { name: "Job search pack", description: "More room to find the role that fits.", price: 5, unit: "one time", note: "20 tailoring credits", action: "Get 20 credits", features: ["Everything in Free", "20 job-specific tailored resumes", "Line-by-line AI suggestions", "Accept, keep original, or retry", "Download your saved copies again"] },
] as const;

export function PricingPlans() {
  function paymentUnavailable() {
    toast.add({ title: "Payments aren’t available yet", description: "You can keep using Rello for free. No payment has been taken." });
  }
  return (
    <>
      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <article key={plan.name} className="pricing-plan" data-featured={plan.price === 5 || undefined}>
            <div className="flex min-h-7 items-center justify-between gap-2">
              <h3>{plan.name}</h3>
              {plan.price === 5 && <span className="shrink-0 rounded-full border border-primary/20 px-2 py-1 text-[10px] font-medium text-primary">Best value</span>}
            </div>
            <p className="plan-description">{plan.description}</p>
            <p className="plan-price"><strong>${plan.price}</strong><span>USD · {plan.unit}</span></p>
            <p className="plan-availability">{plan.note}</p>
            {plan.price === 0 ? (
              <Button className="plan-action" variant="outline" nativeButton={false} render={<Link href="/resumes" />}>{plan.action}<ArrowRightIcon data-icon="inline-end" /></Button>
            ) : (
              <Button className="plan-action" variant={plan.price === 5 ? "default" : "outline"} onClick={paymentUnavailable}>{plan.action}<ArrowRightIcon data-icon="inline-end" /></Button>
            )}
            <ul className="plan-features">
              {plan.features.map((feature) => <li key={feature}><CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" /><span>{feature}</span></li>)}
            </ul>
          </article>
        ))}
      </div>
      <p className="pricing-note">1 credit = 1 tailored resume. No subscriptions.</p>
    </>
  );
}
