import { Suspense } from "react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { Benefits, Faq, FinalCta, Hero, HowItWorks, Pricing } from "@/features/home/landing";

// Returning visitors with a session never see this page: the proxy sends
// them straight to /resumes.
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <Suspense>
        <AuthNotice />
      </Suspense>
    </>
  );
}
