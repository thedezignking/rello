import { Suspense } from "react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { Faq, FinalCta, Hero, HowItWorks, Pricing, Templates, WhyRello } from "@/features/home/landing";

// Returning visitors with a session never see this page: the proxy sends
// them straight to /resumes.
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main className="overflow-x-clip">
        <Hero />
        <HowItWorks />
        <WhyRello />
        <Templates />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter bordered={false} />
      <Suspense>
        <AuthNotice />
      </Suspense>
    </>
  );
}
