import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="October 30, 2026">
      <p>By using Rello you agree to these terms.</p>

      <h2>Your content</h2>
      <p>
        Your resumes are yours. You give us permission to store and process them only to run Rello for you — saving,
        tailoring, improving and exporting them.
      </p>

      <h2>Be truthful</h2>
      <p>
        Rello is built to work only from what you tell it, and suggests changes rather than making them. You&apos;re
        responsible for what goes on your resume. Review every suggestion before you use it, and don&apos;t add
        experience you don&apos;t have.
      </p>

      <h2>No guarantees</h2>
      <p>
        We work hard to make Rello useful, but we can&apos;t promise interviews, job offers, or that any particular
        hiring system will read your resume a certain way. AI suggestions can be wrong.
      </p>

      <h2>Fair use</h2>
      <p>
        AI features have a daily limit per account so the service stays fast and affordable for everyone. Don&apos;t
        try to get around it, overload the service, or use Rello to process content that isn&apos;t yours.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, we&apos;ll update this page and the date above.</p>
    </LegalPage>
  );
}
