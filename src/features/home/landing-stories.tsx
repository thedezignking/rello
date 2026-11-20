"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STORY_TIMING = [2200, 2200, 2800, 2800] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Decorative stories advance only while visible; reduced motion shows the outcome. */
function useStory() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.4 });
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!visible || reduced) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden)
        timer = setTimeout(() => setFrame((value) => (value + 1) % STORY_TIMING.length), STORY_TIMING[frame]);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [visible, reduced, frame]);

  return { ref, frame: reduced ? 3 : frame, reduced };
}

function StoryLabel({ children, complete }: { children: React.ReactNode; complete?: boolean }) {
  return (
    <span className={`story-label${complete ? " story-label-complete" : ""}`}>
      {complete ? <CheckIcon /> : <SparklesIcon />}
      {children}
    </span>
  );
}

function StoryLines({ filled }: { filled: boolean }) {
  return (
    <div className="story-lines">
      {[0, 1, 2, 3].map((line) => (
        <motion.span
          key={line}
          initial={false}
          animate={{ opacity: filled ? 1 : 0.25, transform: filled ? "scaleX(1)" : "scaleX(0.4)" }}
          transition={{ duration: 0.4, delay: line * 0.08 }}
        />
      ))}
    </div>
  );
}

export function HowStory({ step }: { step: number }) {
  const { ref, frame, reduced } = useStory();
  const labels = [
    ["Add your experience", "Reading your resume", "Details in place", "Ready for your next move"],
    ["Paste the role", "Reading the requirements", "Finding your experience", "Ready to tailor"],
    ["Review the original", "See the suggested change", "Change applied", "Your PDF is ready"],
  ];

  return (
    <div ref={ref} className={`how-art how-art-${step + 1} story-art`} aria-hidden="true">
      <div className="how-story-card">
        {step === 0 ? (
          <>
            <div className="story-topline">
              <FileTextIcon />
              <span>Amara’s resume</span>
              <motion.span animate={{ opacity: frame >= 2 ? 1 : 0.35 }}>
                <CheckIcon />
              </motion.span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {frame === 0 ? (
                <motion.div
                  key="upload"
                  className="story-upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                >
                  <UploadIcon />
                  <strong>Amara_Resume.pdf</strong>
                  <span>PDF · Ready to import</span>
                </motion.div>
              ) : (
                <motion.div
                  key="resume"
                  className="story-resume"
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
                >
                  <p className="font-heading text-xl">Amara Okafor</p>
                  <p className="story-muted">Product Designer</p>
                  <StoryLines filled={frame >= 2} />
                  <div className="story-detail-row">
                    <span>Experience</span>
                    <span>Skills</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : step === 1 ? (
          <>
            <div className="story-topline">
              <FileTextIcon />
              <span>The role you’re applying for</span>
            </div>
            <div className="story-job">
              <strong>Product Designer</strong>
              <p className="story-muted">Acme Pay · Remote</p>
            </div>
            <div className="story-requirements">
              {["Design systems", "Usability testing", "Cross-team collaboration"].map((text, index) => (
                <motion.div
                  key={text}
                  initial={false}
                  animate={{
                    opacity: frame >= 2 || (frame === 1 && index === 0) ? 1 : 0.35,
                    transform: frame >= 2 ? "translateX(0px)" : "translateX(3px)",
                  }}
                  transition={{ duration: reduced ? 0 : 0.35, delay: index * 0.12 }}
                >
                  <span className={frame >= 2 ? "story-check" : "story-pending"}>
                    {frame >= 2 && <CheckIcon />}
                  </span>
                  {text}
                </motion.div>
              ))}
            </div>
            <div className="story-progress">
              <motion.span
                initial={false}
                animate={{ transform: `scaleX(${[0.12, 0.45, 0.8, 1][frame]})` }}
                transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="story-topline">
              <SparklesIcon />
              <span>Your experience, refined</span>
            </div>
            <div className="story-edit">
              <span className="story-muted">Experience</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={frame === 0 ? "before" : "after"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                >
                  {frame === 0 ? (
                    "Redesigned onboarding, cutting drop-off from 41% to 23%."
                  ) : (
                    <>
                      Cut onboarding drop-off from <mark>41% to 23%</mark> by redesigning the experience.
                    </>
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className={`story-result${frame >= 2 ? " story-result-done" : ""}`}>
              {frame >= 2 ? <CheckIcon /> : <SparklesIcon />}
              {frame >= 2 ? "Saved to your tailored copy" : "Same facts. A clearer story."}
            </div>
            <motion.div
              className="story-download"
              initial={false}
              animate={{
                opacity: frame === 3 ? 1 : 0.45,
                transform: frame === 3 ? "translateY(0px)" : "translateY(3px)",
              }}
              transition={{ duration: reduced ? 0 : 0.35 }}
            >
              <DownloadIcon />
              {frame === 3 ? "Amara_AcmePay.pdf" : "Download PDF"}
            </motion.div>
          </>
        )}
      </div>
      <StoryLabel complete={frame === 3}>{labels[step][frame]}</StoryLabel>
    </div>
  );
}

export function EvidenceStory() {
  const { ref, frame, reduced } = useStory();
  const blocked = frame >= 1;
  const grounded = frame === 3;

  return (
    <div ref={ref} className="trust-story-stage evidence-story" aria-hidden="true">
      <div className="evidence-source">
        <span className="story-kicker">
          <FileTextIcon /> On your resume
        </span>
        <p>Built a design system used by three product teams.</p>
      </div>
      <div className="evidence-link">
        <motion.span
          initial={false}
          animate={{ transform: blocked ? "scaleY(1)" : "scaleY(0.25)" }}
          transition={{ duration: reduced ? 0 : 0.4 }}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={grounded ? "grounded" : "blocked"}
          className={`evidence-proposal${grounded ? " evidence-grounded" : ""}`}
          initial={{ opacity: 0, transform: "translateY(6px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
        >
          <p>
            {grounded ? (
              "Built a shared design system across three product teams."
            ) : (
              <span className={blocked ? "evidence-struck" : ""}>
                Led 10 designers and grew sign-ups by 45%.
              </span>
            )}
          </p>
          <span className={`evidence-status${blocked && !grounded ? " evidence-status-blocked" : ""}`}>
            {grounded ? <ShieldCheckIcon /> : blocked ? <XIcon /> : <SparklesIcon />}
            {grounded
              ? "Uses your actual experience"
              : blocked
                ? "Blocked: no evidence on your resume"
                : "Checking against your experience"}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MiniDocument({ tailored }: { tailored?: boolean }) {
  return (
    <>
      <FileTextIcon className="story-file-icon" />
      <span className="story-document-name">Amara Okafor</span>
      <div className="story-document-lines">
        <span />
        <span />
        <span className={tailored ? "story-highlight-line" : ""} />
        <span className={tailored ? "story-highlight-line" : ""} />
        <span />
      </div>
    </>
  );
}

export function CopyStory() {
  const { ref, frame, reduced } = useStory();
  return (
    <div ref={ref} className="trust-story-stage copy-story" aria-hidden="true">
      <div className="copy-story-documents">
        <div className="copy-story-original">
          <MiniDocument />
          <span className="copy-document-label">Your original</span>
          <span className="copy-document-note">
            <ShieldCheckIcon /> Unchanged
          </span>
        </div>
        <motion.span
          className="copy-story-arrow"
          initial={false}
          animate={{ opacity: frame >= 1 ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
        >
          <ArrowRightIcon />
        </motion.span>
        <motion.div
          className="copy-story-tailored"
          initial={false}
          animate={{
            opacity: frame >= 1 ? 1 : 0,
            transform: frame >= 1 ? "translateX(0px) rotate(4deg)" : "translateX(-40px) rotate(-3deg)",
          }}
          transition={{ duration: reduced ? 0 : 0.65, ease: EASE }}
        >
          <MiniDocument tailored={frame >= 2} />
          <span className="copy-document-label">For Acme Pay</span>
          <span className="copy-document-note">{frame >= 2 ? "2 lines tailored" : "Creating a copy…"}</span>
        </motion.div>
      </div>
      <StoryLabel complete={frame >= 2}>
        {frame >= 2 ? "New job. Separate copy." : "Your original is always yours"}
      </StoryLabel>
    </div>
  );
}
