"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { MotionConfig, motion, type Variants } from "motion/react";
import { useRef } from "react";

// Motion for the landing page. Each piece is a small client leaf; the page
// itself stays server-rendered. Motion explains the product (a suggestion
// being accepted, a fabricated line being blocked) rather than decorating it,
// and everything settles to a still, complete state for reduced motion.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// "How it works": when the drawing line reaches step i.
const stepAt = (i: number) => 0.25 + i * 0.45;

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

export function StaggerItem({
  as = "div",
  className,
  children,
}: {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}) {
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
    <Stagger
      aria-label="Example job match"
      className="match-demo flex flex-col gap-1 rounded-xl border bg-background/60 p-3 sm:p-4"
    >
      <StaggerItem className="match-demo-header mb-2 flex items-center justify-between gap-3 px-2 text-xs text-muted-foreground">
        <span>Senior Product Designer · Acme Pay</span>
        <span className="shrink-0 tabular-nums">
          {covered} of {rows.length} matched
        </span>
      </StaggerItem>
      <StaggerItem className="match-demo-progress mx-2 mb-2 h-1 overflow-hidden rounded-full bg-muted">
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
          className="match-demo-row flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-150 [@media(hover:hover)]:hover:bg-muted/70"
        >
          <MatchMark status={r.status} delay={0.6 + i * 0.25} />
          <span className="match-demo-requirement min-w-0 flex-1">{r.text}</span>
          <motion.span
            className="match-demo-status ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground"
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
        status === "partial" &&
          "border-[1.5px] border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]",
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
