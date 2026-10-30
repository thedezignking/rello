import { Fragment } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TEMPLATE_IDS } from "@/features/resumes/schema";
import { TEMPLATES } from "@/features/templates";
import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";
import { cn } from "@/lib/utils";
import {
  BlockedDemo,
  CopyDemo,
  HeroDemo,
  MatchDemo,
  PopCheck,
  SpotlightCard,
  Stagger,
  StaggerItem,
  Appear,
  StepDot,
  TimelineLine,
} from "./landing-motion";

// The public landing page. Server-rendered and data-free, so it's fast and
// readable by search engines. Every call to action uses one label and leads
// into /resumes. Previews are the app's own components, not mock-ups.

import { START_LABEL } from "./copy";

function StartButton({ className }: { className?: string }) {
  return (
    <Button
      size="lg"
      className={cn("group/start h-11 px-5 text-[15px]", className)}
      nativeButton={false}
      render={<Link href="/resumes" />}
    >
      {START_LABEL}
      <ArrowRightIcon
        data-icon="inline-end"
        className="transition-transform duration-200 ease-(--ease-out) [@media(hover:hover)]:group-hover/start:translate-x-0.5"
      />
    </Button>
  );
}

const HEADLINE = "Build a resume that opens doors.";

/* Hero: split. Promise on the left, the product doing it on the right. */
export function Hero() {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20 lg:pb-24">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-heading text-[2.75rem] leading-[1.02] font-medium tracking-tight text-balance sm:text-6xl">
            {/* Each word rises in turn. Spaces sit between the spans, since a space inside an inline-block collapses. */}
            {HEADLINE.split(" ").map((w, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className="rise-word" style={{ "--i": i } as React.CSSProperties}>
                  {w}
                </span>
              </Fragment>
            ))}
          </h1>
          <p
            className="rise max-w-md text-lg text-pretty text-muted-foreground"
            style={{ "--i": 5 } as React.CSSProperties}
          >
            Make one clean resume, then tailor a copy to each job, line by line. You approve every change.
          </p>
          <div className="rise flex flex-wrap items-center gap-2" style={{ "--i": 6 } as React.CSSProperties}>
            <StartButton />
            <Button
              size="lg"
              variant="ghost"
              className="h-11 px-4 text-[15px]"
              nativeButton={false}
              render={<a href="#how" />}
            >
              See how it works
            </Button>
          </div>
        </div>
        <div className="rise" style={{ "--i": 7 } as React.CSSProperties}>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

/* Templates: a gallery of real renders. */
export function Templates() {
  return (
    <section id="templates" className="reveal mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
      <div className="max-w-xl">
        <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          Four templates. Switch any time.
        </h2>
        <p className="mt-3 text-muted-foreground">
          All single-column with real, selectable text, so they read well on screen, on paper and in hiring systems.
        </p>
      </div>
      <Stagger as="ul" className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
        {TEMPLATE_IDS.map((id, i) => (
          <StaggerItem as="li" key={id} className="group">
            <div
              className={cn(
                "overflow-hidden rounded-md border bg-white shadow-page transition-[transform,box-shadow] duration-300 ease-(--ease-out)",
                "[@media(hover:hover)]:group-hover:-translate-y-1.5 [@media(hover:hover)]:group-hover:shadow-[0_18px_40px_-14px_rgb(21_23_28/0.28)]",
                i % 2 ? "md:translate-y-6" : "",
              )}
            >
              <PagePreview templateId={id} content={SAMPLE_CONTENT} mode="thumb" />
            </div>
            <p className={cn("mt-3 text-sm font-medium", i % 2 ? "md:mt-9" : "")}>{TEMPLATES[id].name}</p>
            <p className="text-sm text-muted-foreground">{TEMPLATES[id].blurb}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

const STEPS = [
  {
    title: "Create or import your resume",
    body: "Start from a template, or upload the PDF or Word file you already have.",
  },
  {
    title: "Paste a job description",
    body: "Rello reads the role and matches it against what's already on your resume.",
  },
  {
    title: "Review and download",
    body: "Accept, reject or retry each suggested line, then download a clean PDF.",
  },
];

/* How it works: a real sequence, so it's numbered. A timeline, not cards. */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-28 sm:px-6">
      <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">How it works</h2>
      {/* One thing at a time: the line draws, and each step lights up and appears as the line reaches it. */}
      <ol className="relative mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
        <span aria-hidden className="absolute top-4 right-8 left-8 hidden h-px bg-border md:block" />
        <TimelineLine />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-4 md:flex-col md:gap-5">
            <StepDot n={i + 1} />
            <Appear step={i}>
              <p className="font-medium">{s.title}</p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{s.body}</p>
            </Appear>
          </li>
        ))}
      </ol>
    </section>
  );
}

const MATCH = [
  { status: "covered", text: "Figma and design systems" },
  { status: "covered", text: "User research and usability testing" },
  { status: "partial", text: "4+ years in fintech" },
  { status: "missing", text: "Data visualisation" },
] as const;

/* Why Rello: a gapless three-cell bento (one 2x2, two 1x1). */
export function WhyRello() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
      <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Tailoring you can trust</h2>
      <div className="mt-10 grid grid-flow-dense gap-4 md:grid-cols-3 md:grid-rows-2">
        <SpotlightCard className="flex flex-col justify-between gap-8 rounded-2xl border bg-card p-6 sm:p-8 md:col-span-2 md:row-span-2">
          <div className="max-w-md">
            <h3 className="text-xl font-medium">See what the job wants</h3>
            <p className="mt-2 text-muted-foreground">
              Every requirement is checked against your resume, so you know what you show, what&apos;s thin and
              what&apos;s missing before you apply.
            </p>
          </div>
          <MatchDemo rows={MATCH} />
        </SpotlightCard>

        <SpotlightCard className="flex flex-col gap-4 rounded-2xl border bg-highlight-soft/30 p-6">
          <h3 className="text-lg font-medium">Nothing made up</h3>
          <p className="text-sm text-muted-foreground">
            Suggestions only use what&apos;s already on your resume. Invented numbers are blocked.
          </p>
          <BlockedDemo />
        </SpotlightCard>

        <SpotlightCard className="flex flex-col gap-4 rounded-2xl border bg-accent/30 p-6">
          <h3 className="text-lg font-medium">Your original stays put</h3>
          <p className="text-sm text-muted-foreground">
            Each job gets its own copy, so your main resume never changes.
          </p>
          <CopyDemo />
        </SpotlightCard>
      </div>
    </section>
  );
}

const INCLUDED = [
  "Unlimited resumes and edits",
  "All four templates",
  "PDF downloads",
  "Import from PDF or Word",
  "Job tailoring and AI writing help, with a fair daily limit",
];

export function Pricing() {
  return (
    <section id="pricing" className="reveal mx-auto max-w-6xl scroll-mt-20 px-4 pt-28 sm:px-6">
      <SpotlightCard className="grid gap-10 rounded-2xl border bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
            Free while we&apos;re in beta
          </h2>
          <p className="max-w-md text-muted-foreground">
            Everything here costs nothing today. If paid options come later, you&apos;ll see the price before you pay.
          </p>
          <StartButton className="mt-2" />
        </div>
        <Stagger as="ul" className="flex flex-col gap-3.5">
          {INCLUDED.map((item) => (
            <StaggerItem as="li" key={item} className="flex gap-3">
              <PopCheck className="mt-0.5 shrink-0 text-success" />
              {item}
            </StaggerItem>
          ))}
        </Stagger>
      </SpotlightCard>
    </section>
  );
}

const FAQ = [
  {
    q: "Do I need an account?",
    a: "Not to start. Make and edit a resume straight away, then sign in with Google or an email code when you want to keep it, tailor it or download it.",
  },
  {
    q: "Will the AI make things up?",
    a: "It's built not to. Suggestions only use what's on your resume, invented numbers are blocked, and nothing changes until you accept it. Still read every suggestion: you know your experience best.",
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

export function Faq() {
  return (
    <section
      id="faq"
      className="reveal mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 pt-28 sm:px-6 lg:grid-cols-[1fr_1.6fr]"
    >
      <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Questions</h2>
      <Accordion>
        {FAQ.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="py-5 text-base hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FinalCta() {
  return (
    // Shares the footer's surface, so the closing ask and the footer read as one ending.
    <div className="mt-28 bg-card/40">
      <section className="reveal mx-auto flex max-w-3xl flex-col items-center px-4 py-28 text-center sm:px-6">
        <h2 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          One resume. Every opportunity.
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Make it once, then shape a copy for each role you go after.
        </p>
        <StartButton className="mt-8" />
      </section>
    </div>
  );
}
