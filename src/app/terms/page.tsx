import { LegalPage } from "@/components/legal-page";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Terms of service" };
export const viewport: Viewport = { colorScheme: "light", themeColor: "#f8f9f6" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" href="/terms" updated="November 16, 2026">
      <p>By using Rello you agree to these terms.</p>

      <h2>Your content</h2>
      <p>
        Your resumes are yours. You give us permission to store and process them only to run Rello for you:
        saving, tailoring, improving and exporting them.
      </p>

      <h2>Be truthful</h2>
      <p>
        Rello is built to work only from what you tell it, and suggests changes rather than making them.
        You&apos;re responsible for what goes on your resume. Review every suggestion before you use it, and
        don&apos;t add experience you don&apos;t have.
      </p>

      <h2>No guarantees</h2>
      <p>
        We work hard to make Rello useful, but we can&apos;t promise interviews, job offers, or that any
        particular hiring system will read your resume a certain way. AI suggestions can be wrong.
      </p>

      <h2>Fair use</h2>
      <p>
        Verified accounts receive 10 free tailoring credits once. One credit is used when a tailored copy with
        useful suggestions is saved. Failed attempts and results with no suggested changes don’t spend
        credits. Each tailored copy includes 10 successful AI retries. Editing and re-downloading saved
        resumes are free.
      </p>
      <h2>Credit purchases</h2>
      <p>
        Credit packs are one-time purchases, not subscriptions, and credits do not expire. The checkout shows
        the amount and currency before you pay. Paystack processes payment, and credits are added after
        payment is verified. Reversed payments remove the associated credits, including credits already spent;
        a resulting balance adjustment is covered by future credits. This does not limit any refund or
        consumer rights that apply to you.
      </p>
      <p>
        Import and general AI writing help have a daily limit. Tailoring uses your credits and the retry
        allowance for each copy. Request rate limits keep the service available for everyone. Don&apos;t try
        to get around it, overload the service, or use Rello to process content that isn&apos;t yours.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, we&apos;ll update this page and the date above.</p>
    </LegalPage>
  );
}
