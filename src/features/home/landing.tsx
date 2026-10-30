"use client";

import { ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";

/** Shown above the app for someone who hasn't made a resume yet. */
export function Hero({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <section className="border-b">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-heading text-5xl leading-[1.02] font-medium tracking-tight text-balance sm:text-6xl">
            Build a resume that opens doors.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Create, improve and download a clean, professional resume. When a role catches your eye, tailor a copy to
            it line by line — you approve every change, and your original stays as it is.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="h-11 px-5 text-[15px]" onClick={onStart} disabled={starting}>
              {starting && <Spinner data-icon="inline-start" />}
              Create my free resume
            </Button>
            <Button size="lg" variant="ghost" className="h-11 px-4 text-[15px]" nativeButton={false} render={<a href="#how" />}>
              See how it works
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">No account needed to start.</p>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}

/** A page with one line marked, and the suggestion for it. Purely illustrative. */
function HeroDemo() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[440px] pb-10 lg:pb-0">
      <div className="w-[78%] rotate-[-1.5deg] overflow-hidden rounded-md border shadow-page">
        <PagePreview templateId="modern" content={SAMPLE_CONTENT} mode="thumb" highlight={{ ids: ["s_b2"] }} />
      </div>
      <div className="absolute right-0 bottom-0 w-[70%] rounded-xl border bg-card p-4 shadow-xl lg:-bottom-6">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Suggested</p>
        <p className="mt-1 text-sm leading-relaxed">
          Built and maintain the{" "}
          <mark className="rounded-[2px] bg-highlight-soft px-0.5 text-inherit">Figma</mark> design system used across
          three product teams.
        </p>
        <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
          <SparklesIcon className="mt-px size-3.5 shrink-0 text-primary" />
          Names the tool this job asks for.
        </p>
        <div className="mt-3 flex gap-1.5">
          <span className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground">
            <CheckIcon className="size-3.5" />
            Accept
          </span>
          <span className="inline-flex h-7 items-center rounded-md px-2.5 text-xs text-muted-foreground">Reject</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Create or import your resume",
    body: "Start from a template, or upload the PDF or Word file you already have. Save it once.",
  },
  {
    title: "Paste a job description",
    body: "Rello reads the role and matches it against what's already on your resume.",
  },
  {
    title: "Review and download",
    body: "Accept, reject or retry each suggested line. Your tailored copy downloads as a clean PDF.",
  },
];

const FAQ = [
  {
    q: "Is it free?",
    a: "Yes. Creating, editing and downloading resumes is free, with a fair daily limit on AI help.",
  },
  {
    q: "Will the AI make things up?",
    a: "It's built not to. Suggestions only use what's already on your resume, invented numbers are blocked, and nothing changes until you accept it.",
  },
  {
    q: "Does tailoring change my original resume?",
    a: "No. Each tailored version is a separate copy you can edit, download or delete on its own.",
  },
  {
    q: "Will my resume get past applicant tracking systems?",
    a: "Every template is single-column with real, selectable text, which most systems read well. No one can honestly guarantee how a particular system behaves.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6">
      <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">How it works</h2>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5">
            <span className="font-heading text-2xl text-primary tabular-nums">{i + 1}</span>
            <p className="font-medium">{s.title}</p>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 font-heading text-2xl font-medium tracking-tight">Questions</h2>
      <dl className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt className="font-medium">{f.q}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
