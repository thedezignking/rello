import { Suspense } from "react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthNotice } from "@/features/auth/auth-notice";
import { Faq, FinalCta, Hero, HowItWorks, Pricing, Templates, WhyRello } from "@/features/home/landing";
import { LandingMotion } from "@/features/home/landing-motion";

// Returning visitors with a session never see this page: the proxy sends
// them straight to /resumes.
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main className="relative isolate overflow-x-clip">
        {/* A very faint dot grid, showing only in a few soft patches down the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--landing-dot)_1px,transparent_1.5px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_45%_9%_at_12%_3%,black,transparent),radial-gradient(ellipse_40%_10%_at_90%_20%,black,transparent),radial-gradient(ellipse_42%_9%_at_6%_45%,black,transparent),radial-gradient(ellipse_38%_10%_at_92%_70%,black,transparent),radial-gradient(ellipse_44%_8%_at_10%_86%,black,transparent),radial-gradient(ellipse_46%_8%_at_88%_97%,black,transparent)]"
        />
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
    </>
  );
}
