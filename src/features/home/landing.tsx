import { Fragment } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import { TemplateDemo } from "./template-demo";

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

/** Every section opens the same way: a serif heading and one plain line under it. */
function SectionHeader({ title, lede, className }: { title: string; lede: string; className?: string }) {
  return (
    // Each heading eases in as it scrolls into view, ahead of the section it introduces.
    <div className={cn("reveal max-w-2xl", className)}>
      <h2 className="font-heading text-[2rem] leading-[1.1] font-medium tracking-tight text-balance sm:text-[2.5rem]">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">{lede}</p>
    </div>
  );
}

// Space above each section, so the page keeps one beat from top to bottom.
const SECTION = "mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6 sm:pt-32";

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
            className="rise max-w-[30rem] text-lg text-pretty text-muted-foreground"
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
        <div className="rise" style={{ "--i": 8 } as React.CSSProperties}>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}

/* Templates: a gallery of real renders. */
export function Templates() {
  return (
    <section id="templates" className={SECTION}>
      <SectionHeader
        title="Four templates. Switch any time."
        lede="Your words stay put while the design changes. All single-column with real, selectable text, so they read well on screen, on paper and in hiring systems."
      />
      <div className="mt-12">
        <TemplateDemo />
      </div>
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
    <section id="how" className={SECTION}>
      <SectionHeader title="How it works" lede="From the resume you have to one shaped for the job, in three steps." />
      {/* One thing at a time: the line draws, and each step lights up and appears as the line reaches it. */}
      <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        <span aria-hidden className="absolute top-4 right-8 left-8 hidden h-px bg-border md:block" />
        <TimelineLine />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-4 md:flex-col md:gap-5">
            <StepDot n={i + 1} />
            <Appear step={i}>
              <h3 className="text-[17px] font-medium">{s.title}</h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
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
  { status: "covered", text: "Working closely with engineers" },
  { status: "partial", text: "4+ years in fintech" },
  { status: "partial", text: "Mentoring other designers" },
  { status: "missing", text: "Data visualisation" },
] as const;

/* Why Rello: a gapless three-cell bento (one 2x2, two 1x1). */
export function WhyRello() {
  return (
    <section className={SECTION}>
      <SectionHeader
        title="Tailoring you can trust"
        lede="Rello rewords what's already true about you, and shows you every change before it lands."
      />
      <div className="mt-12 grid grid-flow-dense gap-4 md:grid-cols-3 md:grid-rows-2">
        <SpotlightCard className="flex flex-col justify-between gap-8 rounded-2xl border bg-card p-6 sm:p-8 md:col-span-2 md:row-span-2">
          <div className="max-w-md">
            <h3 className="text-lg font-medium">See what the job wants</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              Every requirement is checked against your resume, so you know what you show, what&apos;s thin and
              what&apos;s missing before you apply.
            </p>
          </div>
          <MatchDemo rows={MATCH} />
        </SpotlightCard>

        <SpotlightCard className="flex flex-col gap-4 rounded-2xl border bg-highlight-soft/30 p-6">
          <h3 className="text-lg font-medium">Nothing made up</h3>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
            Suggestions only use what&apos;s already on your resume. Invented numbers are blocked.
          </p>
          <BlockedDemo />
        </SpotlightCard>

        <SpotlightCard className="flex flex-col gap-4 rounded-2xl border bg-accent/30 p-6">
          <h3 className="text-lg font-medium">Your original stays put</h3>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
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
    <section id="pricing" className={SECTION}>
      <SpotlightCard className="grid gap-10 rounded-2xl border bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-heading text-[2rem] leading-[1.1] font-medium tracking-tight sm:text-[2.5rem]">
            Free while we&apos;re in beta
          </h2>
          <p className="max-w-md text-pretty text-muted-foreground sm:text-lg">
            Everything here costs nothing today. If paid options come later, you&apos;ll see the price before you pay.
          </p>
          <StartButton className="mt-2" />
        </div>
        <Stagger as="ul" className="flex flex-col gap-3.5">
          {INCLUDED.map((item) => (
            <StaggerItem as="li" key={item} className="flex gap-3 text-[15px]">
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
    <section id="faq" className={cn("grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16", SECTION)}>
      <SectionHeader title="Questions" lede="The things people ask before they start." />
      <Accordion>
        {FAQ.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="py-5 text-[17px] font-medium hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="max-w-xl pb-6 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FinalCta() {
  return (
    <div className="mt-24 sm:mt-32">
      <section className="reveal mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-12">
        <h2 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          One resume. Every opportunity.
        </h2>
        <p className="mt-4 max-w-md text-pretty text-muted-foreground sm:text-lg">
          Make it once, then shape a copy for each role you go after.
        </p>
        <StartButton className="mt-8" />
      </section>
    </div>
  );
}
