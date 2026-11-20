import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { Faq, FinalCta, Hero, HowItWorks, Pricing, Templates, WhyRello } from "@/features/home/landing";
import { LandingMotion } from "@/features/home/landing-motion";
import "@/features/home/landing.css";
import type { Viewport } from "next";
import { Suspense } from "react";

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f8f9f6" };

// Returning visitors with a session never see this page: the proxy sends
// them straight to /resumes.
export default function LandingPage() {
  return (
    <div className="landing-shell">
      <div className="landing-guides" aria-hidden="true" />
      <LandingHeader />
      <main id="main-content" tabIndex={-1} className="relative isolate overflow-x-clip">
        <LandingMotion>
          <Hero />
          <HowItWorks />
          <WhyRello />
          <Templates />
          <Pricing />
          <Faq />
          <FinalCta />
        </LandingMotion>
      </main>
      <SiteFooter variant="full" />
      <Suspense>
        <AuthNotice />
      </Suspense>
    </div>
  );
}
