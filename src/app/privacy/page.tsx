import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 30, 2026">
      <p>
        Rello helps you write and tailor your resume. To do that we store what you put in it. This page explains what
        we keep, why, and how to delete it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your account: your email address, and your name if you add it or sign in with Google.</li>
        <li>Your resumes and tailored copies, exactly as you write them.</li>
        <li>Job descriptions you paste in, kept with the tailored copy they produced.</li>
        <li>A log of each AI request (what kind, when, and how much text) so we can keep usage fair and costs down.</li>
      </ul>

      <h2>What we don&apos;t keep</h2>
      <ul>
        <li>Files you import. We read the text out of your PDF or DOCX and then discard the file.</li>
        <li>PDFs you download. They&apos;re generated from your saved resume each time.</li>
      </ul>

      <h2>AI processing</h2>
      <p>
        When you tailor a resume, ask for a rewrite, or import a file, the relevant text is sent to an AI model through
        OpenRouter to produce suggestions. We send only what that task needs. We don&apos;t use your resumes to train
        models or for marketing.
      </p>

      <h2>Where it lives</h2>
      <p>
        Your data is stored with Supabase, our database provider, and only your account can read it. If you use Rello
        as a guest, your resumes are tied to that browser until you sign in.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any resume from your list, or delete your whole account and everything in it from{" "}
        <Link href="/settings" className="text-primary underline underline-offset-4">
          Settings
        </Link>
        . Deletion is permanent.
      </p>
    </LegalPage>
  );
}
