import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { Appear, MatchDemo, SpotlightCard } from "./landing-motion";
import { CopyStory, EvidenceStory, HowStory } from "./landing-stories";
import { PaperStage } from "./paper-stage";
import { PricingPlans } from "./pricing-plans";
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
const SECTION = "landing-section scroll-mt-20";

const HEADLINE = "Build a resume that opens doors.";

/* Hero: split. Promise on the left, the product doing it on the right. */
export function Hero() {
  return (
    <section className="landing-hero">
      <div className="grid items-center lg:grid-cols-[0.92fr_1.08fr]">
        <div className="hero-copy flex flex-col items-start gap-6">
          <h1 className="font-heading text-[3.2rem] leading-[0.98] font-medium tracking-tight text-balance sm:text-[4.25rem]">
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
        <div className="hero-stage-wrap rise" style={{ "--i": 8 } as React.CSSProperties}>
          <PaperStage />
        </div>
      </div>
      <div className="landing-proof">
        <span>Made for your next move.</span>
        <span>Real, selectable PDF text</span>
        <span>Four considered templates</span>
        <span>You approve every change</span>
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
      <div className="template-stage mt-12">
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

/* Each numbered step acts out one part of the flow without requiring a click. */
export function HowItWorks() {
  return (
    <section id="how" className={SECTION}>
      <SectionHeader
        title="Three steps to your next opportunity."
        lede="From the resume you have to one shaped for the job."
      />
      <ol className="how-grid">
        {STEPS.map((s, i) => (
          <li key={s.title} className="how-card">
            <Appear step={i}>
              <HowStory step={i} />
              <div className="how-caption">
                <span className="how-number">{i + 1}</span>
                <h3 className="text-[16px] font-medium">{s.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
              </div>
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
        lede="A clearer way to tell your story. Review the changes, see why they matter, and keep the final say."
      />
      <div className="trust-grid mt-12 grid grid-flow-dense md:grid-cols-3 md:grid-rows-2">
        <SpotlightCard className="trust-feature flex flex-col gap-6 p-6 sm:p-8 md:col-span-2 md:row-span-2">
          <div className="max-w-md">
            <h3 className="text-lg font-medium">See what the job wants</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              Every requirement is checked against your resume, so you know what you show, what&apos;s thin
              and what&apos;s missing before you apply.
            </p>
          </div>
          <div className="match-stage">
            <MatchDemo rows={MATCH} />
          </div>
        </SpotlightCard>

        <SpotlightCard className="trust-small flex flex-col gap-4 bg-card/60 p-6">
          <h3 className="text-lg font-medium">Grounded in your experience</h3>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
            Suggestions are checked against your resume. Review the facts before using them.
          </p>
          <EvidenceStory />
        </SpotlightCard>

        <SpotlightCard className="trust-small flex flex-col gap-4 bg-card/60 p-6">
          <h3 className="text-lg font-medium">Your original stays put</h3>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
            Each job gets its own copy, so your main resume never changes.
          </p>
          <CopyStory />
        </SpotlightCard>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className={SECTION}>
      <SectionHeader
        title="Simple, transparent pricing."
        lede="Start free. Add a few tailoring credits when you need them."
      />
      <PricingPlans />
    </section>
  );
}

const FAQ = [
  {
    q: "How do tailoring credits work?",
    a: "Sign in to receive 10 free credits, once per account. One credit creates one tailored copy for a job, with 10 AI retries included. Failed attempts don’t spend credits. Editing and downloading saved copies are free. Paid packs are one-time purchases, and credits don’t expire.",
  },
  {
    q: "Do I need an account?",
    a: "Not to start. Make and edit a resume straight away, then sign in with Google or an email code when you want to keep it, tailor it or download it.",
  },
  {
    q: "Will the AI make things up?",
    a: "AI can misread or invent details. Rello checks proposed edits against your resume and blocks new numbers, but you should verify every claim. Nothing changes until you accept it.",
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
    <section id="faq" className={cn("landing-faq", SECTION)}>
      <h2 className="font-heading font-medium tracking-tight">Common questions</h2>
      <Accordion multiple={false} className="mt-8 border-t">
        {FAQ.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="py-5 text-[17px] font-medium hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="max-w-3xl pb-6 text-[15px] leading-relaxed text-pretty text-muted-foreground">
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
    <div className="landing-closing">
      <section className="reveal mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-12">
        <h2 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          One resume. Every opportunity.
        </h2>
        <p className="mt-4 max-w-md text-pretty text-muted-foreground sm:max-w-none sm:text-lg">
          Make it once, then shape a copy for each role you go after.
        </p>
        <StartButton className="mt-8" />
      </section>
    </div>
  );
}
