import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/document-page";

export const metadata: Metadata = {
  title: "Getting started",
  description: "Create or import a resume, tailor a copy to a job, review suggestions, and download your PDF with Rello.",
};
export const viewport: Viewport = { colorScheme: "light", themeColor: "#f8f9f6" };

export default function GuidePage() {
  return (
    <DocumentPage title="Getting started" href="/guide" description="From your first resume to a copy that fits the job. Here’s how to make the most of Rello.">
      <h2>Create or import your resume</h2>
      <p>Open <Link href="/resumes">Your resumes</Link> and start with a template, or choose Import to bring in a PDF or Word document. Imports support PDF and DOCX files under 5 MB. A text-based file works best.</p>
      <p>Check the imported details before continuing. Make sure your name, roles, dates, education, and skills are correct. You can open one section at a time while the preview updates beside it.</p>

      <h2>Tailor a copy to a job</h2>
      <p>From your resume, choose Tailor for a job and paste the job description. Include the responsibilities and requirements so Rello has enough context. Job title and company are optional.</p>
      <p>Tailoring creates a separate copy. Your original resume stays available for the next application.</p>

      <h2>Understand the job match</h2>
      <p>The match compares the job’s requirements with the experience you have already added:</p>
      <ul>
        <li><strong>On your resume:</strong> the requirement has supporting experience.</li>
        <li><strong>Partly:</strong> your resume shows some relevant experience, but may need more detail.</li>
        <li><strong>Missing:</strong> Rello could not find supporting experience in your resume.</li>
      </ul>
      <p>Use this as a review checklist. Add detail only when it reflects something you actually did.</p>

      <h2>Review each suggestion</h2>
      <p>Compare the original wording with the proposed change. Removed text and added text are highlighted so you can see the difference.</p>
      <ul>
        <li><strong>Use suggestion</strong> applies the change to your tailored copy.</li>
        <li><strong>Keep original</strong> keeps your wording.</li>
        <li><strong>Try again</strong> asks for another suggestion.</li>
      </ul>
      <p>Read every change, including names, numbers, and claims about your work. AI can make mistakes, and you decide what belongs on your resume.</p>

      <h2>Choose a template and download</h2>
      <p>You can switch between the four templates without rewriting your content. Check the preview, then choose Download PDF. If you are asked to sign in, use Google or an email code to continue.</p>
      <p>If a download fails, check your connection and try again. For import problems, try a text-based PDF or DOCX instead of a scanned image.</p>

      <h2>Keep access to your work</h2>
      <p>Guest resumes are tied to the browser where you created them. Sign in to keep access to your saved work across devices.</p>
      <p>Manage your account or delete your data in <Link href="/settings">Settings</Link>. For details about how your content is handled, read the <Link href="/privacy">Privacy policy</Link>. You can also find answers to common questions on the <Link href="/?home#faq">landing page</Link>.</p>
    </DocumentPage>
  );
}
