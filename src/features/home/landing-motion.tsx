"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, MousePointer2Icon } from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { AiIcon } from "@/components/ai-icon";
import type { ResumeContent } from "@/features/resumes/schema";
import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";
import { diffInline } from "@/features/tailor/diff";
import { cn } from "@/lib/utils";

// Motion for the landing page. Each piece is a small client leaf; the page
// itself stays server-rendered. Motion explains the product (a suggestion
// being accepted, a fabricated line being blocked) rather than decorating it,
// and everything settles to a still, complete state for reduced motion.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SPRING = { type: "spring", bounce: 0, visualDuration: 0.45 } as const;

// "How it works": when the drawing line reaches step i.
const stepAt = (i: number) => 0.25 + i * 0.45;

/**
 * Bento demos play one after another on wide screens, where all three cards
 * are in view together. Stacked on a phone each card is reached on its own,
 * so there it starts as soon as it's seen. Only read inside transitions,
 * after mount, so it never affects what the server renders.
 */
const inTurn = (wide: number) =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? wide : 0;

/** Honours the visitor's reduced-motion setting for every animation inside. */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/* ---------- Scroll-in stagger ---------- */

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE_OUT } },
};

type Tag = "div" | "ul" | "ol" | "li";

/** Children wrapped in StaggerItem ease in one after another when scrolled into view. */
export function Stagger({
  as = "div",
  className,
  children,
  ...rest
}: { as?: Tag; className?: string; children: React.ReactNode } & React.AriaAttributes) {
  const C = motion[as] as typeof motion.div;
  return (
    <C
      className={className}
      variants={group}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      {...rest}
    >
      {children}
    </C>
  );
}

export function StaggerItem({ as = "div", className, children }: { as?: Tag; className?: string; children: React.ReactNode }) {
  const C = motion[as] as typeof motion.div;
  return (
    <C className={className} variants={item}>
      {children}
    </C>
  );
}

/* ---------- Spotlight card ---------- */

/**
 * A card with a soft light that follows the pointer. The position goes
 * straight to CSS variables on the element, so moving the mouse never
 * re-renders React.
 */
export function SpotlightCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <article
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group/spot relative isolate overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-300",
        "before:bg-[radial-gradient(420px_circle_at_var(--x,50%)_var(--y,0%),color-mix(in_oklab,var(--primary)_9%,transparent),transparent_70%)]",
        "[@media(hover:hover)]:hover:before:opacity-100",
        className,
      )}
    >
      {children}
    </article>
  );
}

/* ---------- Hero: a suggestion being accepted ---------- */

const SCENES = [
  {
    line: "s_b2",
    before: "Built and maintain the design system used across three product teams.",
    after: "Built and maintain the Figma design system used across three product teams.",
    reason: "Names the tool the job asks for, with the same facts.",
  },
  {
    line: "s_b1",
    before: "Redesigned merchant onboarding, cutting drop-off from 41% to 23% in two quarters.",
    after: "Cut merchant onboarding drop-off from 41% to 23% in two quarters with a full redesign.",
    reason: "Leads with the result. Same numbers, nothing added.",
  },
] as const;

type Phase = "suggest" | "press" | "accepted";
const PHASE_MS: Record<Phase, number> = { suggest: 2800, press: 650, accepted: 1900 };

function withLine(id: string, text: string): ResumeContent {
  return {
    ...SAMPLE_CONTENT,
    experience: SAMPLE_CONTENT.experience.map((e) => ({
      ...e,
      bullets: e.bullets.map((b) => (b.id === id ? { ...b, text } : b)),
    })),
  };
}

/** The hero's product shot, acted out: a line is marked, a suggestion arrives, Accept is pressed, the page updates. */
export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<Phase>("suggest");

  // Advance the little story only while it's on screen.
  useEffect(() => {
    if (!inView || reduce) return;
    const t = setTimeout(() => {
      if (phase === "suggest") setPhase("press");
      else if (phase === "press") setPhase("accepted");
      else {
        setScene((s) => (s + 1) % SCENES.length);
        setPhase("suggest");
      }
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, inView, reduce]);

  const s = SCENES[scene];
  const accepted = phase === "accepted";
  const content = accepted ? withLine(s.line, s.after) : SAMPLE_CONTENT;

  // A gentle tilt toward the pointer, on springs so it settles naturally.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 20 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 120, damping: 20 });

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative mx-auto w-full max-w-[520px] pb-16 [perspective:1200px] sm:pb-10"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div style={{ rotateX, rotateY }}>
        <div className="w-[82%] overflow-hidden rounded-md border shadow-page sm:rotate-[-1.5deg]">
          <PagePreview
            templateId="modern"
            content={content}
            mode="thumb"
            highlight={accepted ? { ids: [], active: [s.line] } : { ids: [s.line] }}
          />
        </div>

        <div
          className="absolute right-0 bottom-0 w-[74%] rounded-xl border bg-card p-4 shadow-[0_24px_48px_-16px_rgb(21_23_28/0.25)] sm:p-5"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${scene}-${accepted}`}
              initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              {accepted ? <AcceptedNote text={s.after} /> : <SuggestionBody scene={scene} pressed={phase === "press"} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function SuggestionBody({ scene, pressed }: { scene: number; pressed: boolean }) {
  const s = SCENES[scene];
  const parts = diffInline(s.before, s.after);
  return (
    <div className="relative">
      <p className="text-xs text-muted-foreground">Suggested for this job</p>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {parts.map((p, i) => {
          if (p.kind === "same") return <span key={i}>{p.text}</span>;
          const word = p.text.trimEnd();
          const space = p.text.slice(word.length) || (p.kind === "removed" && parts[i + 1] ? " " : "");
          return p.kind === "removed" ? (
            <span key={i}>
              <Strike play delay={0.45} className="text-muted-foreground">
                {word}
              </Strike>
              {space}
            </span>
          ) : (
            <span key={i}>
              {/* The highlighter sweeps over the new words. */}
              <motion.mark
                className="rounded-[2px] bg-[linear-gradient(var(--highlight-soft),var(--highlight-soft))] bg-no-repeat px-0.5 text-inherit"
                style={{ backgroundColor: "transparent" }}
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ delay: 0.75, duration: 0.55, ease: EASE_OUT }}
              >
                {word}
              </motion.mark>
              {space}
            </span>
          );
        })}
      </p>
      <motion.p
        className="mt-2 flex gap-1.5 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.4 }}
      >
        <AiIcon className="mt-px size-3.5 shrink-0 text-primary" />
        {s.reason}
      </motion.p>
      <div className="relative mt-3 flex gap-1.5">
        <motion.span
          animate={{ scale: pressed ? 0.94 : 1 }}
          transition={{ type: "spring", bounce: 0.3, visualDuration: 0.2 }}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
        >
          <CheckIcon className="size-3.5" />
          Accept
        </motion.span>
        <span className="inline-flex h-7 items-center rounded-md px-2.5 text-xs text-muted-foreground">Reject</span>
        {/* The pointer glides in and presses Accept. */}
        <motion.span
          className="pointer-events-none absolute top-0 left-0 text-foreground"
          initial={{ opacity: 0, x: 140, y: 34 }}
          animate={pressed ? { opacity: 1, x: 34, y: 12, scale: 0.9 } : { opacity: 0, x: 140, y: 34, scale: 1 }}
          transition={SPRING}
        >
          <MousePointer2Icon className="size-4 fill-foreground stroke-background" />
        </motion.span>
      </div>
    </div>
  );
}

function AcceptedNote({ text }: { text: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-success">
        <motion.span
          className="flex size-4 items-center justify-center rounded-full bg-success text-white"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, visualDuration: 0.35 }}
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </motion.span>
        Accepted · added to your tailored copy
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed">{text}</p>
      <p className="mt-2 text-xs text-muted-foreground">Your original resume is unchanged.</p>
    </div>
  );
}

/* ---------- Timeline ---------- */

/** The connecting line of "How it works", drawn left to right as it comes into view. */
export function TimelineLine() {
  return (
    <motion.span
      aria-hidden
      className="absolute top-4 right-8 left-8 hidden h-px origin-left bg-primary/40 md:block"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      transition={{ duration: stepAt(2), ease: EASE_OUT, delay: 0.15 }}
    />
  );
}

/** A step number that lights up as the line reaches it. */
export function StepDot({ n }: { n: number }) {
  return (
    <motion.span
      className="relative flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums"
      initial={{ scale: 0.85, backgroundColor: "var(--background)", color: "var(--primary)", borderColor: "var(--border)" }}
      whileInView={{
        scale: 1,
        backgroundColor: "var(--primary)",
        color: "var(--primary-foreground)",
        borderColor: "var(--primary)",
      }}
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      transition={{ delay: stepAt(n - 1), duration: 0.4, ease: EASE_OUT }}
    >
      {n}
    </motion.span>
  );
}

/** A step's text, arriving with its number rather than all at once. */
export function Appear({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      transition={{ delay: stepAt(step) + 0.1, duration: 0.5, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Bento demos ---------- */

type MatchRow = { text: string; status: "covered" | "partial" | "missing" };

/** The job-match list: rows arrive in turn, each mark pops in, and the coverage bar fills. */
export function MatchDemo({ rows }: { rows: readonly MatchRow[] }) {
  const covered = rows.filter((r) => r.status === "covered").length;
  return (
    <Stagger aria-label="Example job match" className="flex flex-col gap-1 rounded-xl border bg-background/60 p-3 sm:p-4">
      <StaggerItem className="mb-2 flex items-center justify-between gap-3 px-2 text-xs text-muted-foreground">
        <span>Senior Product Designer · Acme Pay</span>
        <span className="tabular-nums">
          {covered} of {rows.length} shown
        </span>
      </StaggerItem>
      <StaggerItem className="mx-2 mb-2 h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full origin-left rounded-full bg-success"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: covered / rows.length }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 + rows.length * 0.25, duration: 0.7, ease: EASE_OUT }}
        />
      </StaggerItem>
      {rows.map((r, i) => (
        <StaggerItem
          key={r.text}
          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-150 [@media(hover:hover)]:hover:bg-muted/70"
        >
          <MatchMark status={r.status} delay={0.6 + i * 0.25} />
          {r.text}
          <motion.span
            className="ml-auto text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 + i * 0.25, duration: 0.3 }}
          >
            {r.status === "covered" ? "On your resume" : r.status === "partial" ? "Partly" : "Missing"}
          </motion.span>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function MatchMark({ status, delay }: { status: MatchRow["status"]; delay: number }) {
  return (
    <motion.span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full",
        status === "covered" && "bg-success text-white",
        status === "partial" && "border-[1.5px] border-dashed border-primary",
        status === "missing" && "border-[1.5px] border-muted-foreground/50",
      )}
      initial={{ scale: 0.4, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", bounce: 0.45, visualDuration: 0.35, delay }}
    >
      {status === "covered" && <CheckIcon className="size-2.5" strokeWidth={3.5} />}
    </motion.span>
  );
}

/**
 * A strike-through that draws across the text. It's a 1px background on the
 * inline element, so when the text wraps it runs along each line in turn,
 * where a positioned bar would cut through the middle of the block.
 */
function Strike({
  play,
  delay = 0,
  duration = 0.45,
  className,
  children,
}: {
  play: boolean;
  delay?: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.span
      className={cn(
        "bg-[linear-gradient(var(--destructive),var(--destructive))] bg-[position:0_58%] bg-no-repeat",
        className,
      )}
      initial={{ backgroundSize: "0% 1px" }}
      animate={play ? { backgroundSize: "100% 1px" } : undefined}
      transition={{ delay, duration, ease: EASE_OUT }}
    >
      {children}
    </motion.span>
  );
}

/** A made-up claim appears, gets struck out, and is labelled as blocked. */
export function BlockedDemo() {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const start = inTurn(2);
  return (
    <p ref={ref} className="mt-auto rounded-lg border bg-card px-3 py-2.5 text-sm">
      <Strike play={inView} delay={start + 0.3} duration={0.7} className="text-muted-foreground">
        Led a team of 10 and grew sign-ups by 45%.
      </Strike>
      <motion.span
        className="mt-1 block text-xs font-medium text-destructive"
        initial={{ opacity: 0, x: 0 }}
        animate={inView ? { opacity: 1, x: [0, -3, 3, -2, 0] } : undefined}
        transition={{ opacity: { delay: start + 1, duration: 0.2 }, x: { delay: start + 1.05, duration: 0.35 } }}
      >
        Blocked: not on your resume
      </motion.span>
    </p>
  );
}

/** The tailored copy slides out from behind the original; hovering the card pulls it a little further. */
export function CopyDemo() {
  return (
    <div aria-hidden className="mt-auto flex items-end gap-3">
      <div className="relative z-10 w-16 overflow-hidden rounded-sm border bg-white shadow-page">
        <PagePreview templateId="classic" content={SAMPLE_CONTENT} mode="thumb" />
      </div>
      <motion.div
        className="relative w-16"
        initial={{ x: -76, rotate: 0, opacity: 0.6 }}
        whileInView={{ x: 0, rotate: 3, opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ type: "spring", bounce: 0.25, visualDuration: 0.6, delay: inTurn(3.4) + 0.2 }}
      >
        <div className="overflow-hidden rounded-sm border bg-white shadow-page transition-transform duration-300 ease-(--ease-out) [@media(hover:hover)]:group-hover/spot:translate-x-2 [@media(hover:hover)]:group-hover/spot:rotate-2">
          <PagePreview templateId="classic" content={SAMPLE_CONTENT} mode="thumb" highlight={{ ids: ["summary", "s_b2"] }} />
        </div>
      </motion.div>
    </div>
  );
}

/** A check that pops in when its row arrives. */
export function PopCheck({ className }: { className?: string }) {
  return (
    <motion.span
      className={cn("inline-flex", className)}
      initial={{ scale: 0.4, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", bounce: 0.45, visualDuration: 0.35, delay: 0.2 }}
    >
      <CheckIcon className="size-4" />
    </motion.span>
  );
}
