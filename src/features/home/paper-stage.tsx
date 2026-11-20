"use client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";
import { SuggestedText, SuggestedTextContext } from "@/features/templates/suggested-text";
import { CheckIcon, MousePointer2Icon, SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SCENES = [
  {
    id: "s_b1",
    original: SAMPLE_CONTENT.experience[0].bullets[0].text,
    suggested:
      "Cut merchant onboarding drop-off from 41% to 23% in two quarters by redesigning the onboarding experience.",
    reason:
      "Lead with the onboarding result this product design role asks for. Same experience. Same numbers.",
  },
  {
    id: "s_b2",
    original: SAMPLE_CONTENT.experience[0].bullets[1].text,
    suggested: "Built and maintain a shared design system across three product teams.",
    reason:
      "Bring your cross-team design systems experience forward for this role. No extra responsibilities added.",
  },
] as const;

type Phase = "suggest" | "press" | "applied";
const TIMING = { suggest: 5200, press: 750, applied: 3200 };

export function PaperStage() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.25 });
  const reducedMotion = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("suggest");

  useEffect(() => {
    if (!visible || reducedMotion) return;
    const timer = setTimeout(() => {
      if (phase === "suggest") setPhase("press");
      else if (phase === "press") setPhase("applied");
      else {
        setSceneIndex((index) => (index + 1) % SCENES.length);
        setPhase("suggest");
      }
    }, TIMING[phase]);
    return () => clearTimeout(timer);
  }, [visible, reducedMotion, phase]);

  const scene = SCENES[sceneIndex];
  const applied = phase === "applied";
  const change = { original: scene.original, suggested: scene.suggested, interactive: false };
  const content = {
    ...SAMPLE_CONTENT,
    experience: SAMPLE_CONTENT.experience.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map((bullet) =>
        bullet.id === scene.id && applied ? { ...bullet, text: scene.suggested } : bullet,
      ),
    })),
  };

  return (
    <div ref={ref} className="paper-stage">
      <p className="sr-only">
        Example of Rello tailoring a resume: review a proposed rewrite and its explanation, then apply it to a
        separate copy while preserving the original.
      </p>
      <div aria-hidden="true">
        <div className="stage-document">
          <SuggestedTextContext.Provider value={applied ? {} : { [scene.id]: change }}>
            <PagePreview templateId="classic" content={content} mode="content" className="rounded-[7px]" />
          </SuggestedTextContext.Provider>
        </div>
        <div className="stage-suggestion">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <SparklesIcon className="size-3.5 text-primary" />{" "}
              {applied ? "Change applied" : "Suggested for this job"}
            </span>
            <span className="text-muted-foreground">Experience</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${sceneIndex}-${applied}`}
              initial={{ opacity: 0, transform: "translateY(5px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
            >
              <SuggestedTextContext.Provider value={applied ? {} : { [scene.id]: change }}>
                <p className="mt-3 text-sm leading-relaxed">
                  <SuggestedText id={scene.id}>{applied ? scene.suggested : scene.original}</SuggestedText>
                </p>
              </SuggestedTextContext.Provider>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {applied ? "Saved to your tailored copy. Your original resume is unchanged." : scene.reason}
              </p>
              <div className="relative mt-4 flex min-h-8 items-center gap-2">
                {applied ? (
                  <span className="flex items-center gap-1.5 text-xs text-success">
                    <CheckIcon className="size-3.5" /> Added to your tailored copy
                  </span>
                ) : (
                  <>
                    <motion.span
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                      animate={{ transform: phase === "press" ? "scale(0.95)" : "scale(1)" }}
                      transition={{ duration: 0.15 }}
                    >
                      <CheckIcon className="size-3.5" /> Use suggestion
                    </motion.span>
                    <span className="px-2 text-xs text-muted-foreground">Keep original</span>
                    {!reducedMotion && (
                      <motion.span
                        className="pointer-events-none absolute text-foreground"
                        initial={{ opacity: 0, transform: "translate(170px, 30px)" }}
                        animate={{
                          opacity: phase === "press" ? 1 : 0,
                          transform: phase === "press" ? "translate(70px, 16px)" : "translate(170px, 30px)",
                        }}
                        transition={{ duration: 0.45 }}
                      >
                        <MousePointer2Icon className="size-4 fill-foreground stroke-white" />
                      </motion.span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
