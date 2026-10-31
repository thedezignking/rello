"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignLeftIcon,
  ArrowLeftIcon,
  AwardIcon,
  BriefcaseIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  DownloadIcon,
  FolderOpenIcon,
  GraduationCapIcon,
  MousePointer2Icon,
  UserRoundIcon,
  WrenchIcon,
} from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { AiIcon } from "@/components/ai-icon";
import { TEMPLATE_IDS } from "@/features/resumes/schema";
import { TEMPLATES } from "@/features/templates";
import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";
import { cn } from "@/lib/utils";

// The templates section as a screen recording of the editor: a browser
// window filled by the app, where the pointer opens the Template menu, picks
// the next template, and the same resume restyles. The screen is laid out at
// a real desktop size (SCREEN) and scaled to fit, so it reads like a
// recording at any width, and the pointer can work in fixed screen
// coordinates. Like a screen-recording tool's auto-zoom, the camera glides in
// on the menu while the pointer works it, then pulls back so the restyled
// page is seen whole. It loops while on screen; reduced motion holds still.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SCREEN = { w: 1280, h: 760 };

type Phase = "idle" | "aim" | "open" | "hover" | "pick";
const PHASE_MS: Record<Phase, number> = { idle: 1000, aim: 650, open: 300, hover: 400, pick: 800 };

// Screen coordinates. Header is 56px tall with 16px side padding; on the
// right sit the Download button (150px), the Template menu (124px) and the
// Tailor button (150px), 8px apart. The menu opens 6px under its trigger.
const SELECT = { x: 1280 - 16 - 150 - 8 - 124, y: 12, w: 124, h: 32 };
const MENU = { x: SELECT.x + SELECT.w - 176, y: SELECT.y + SELECT.h + 6, w: 176 };
const POINTER = {
  rest: { x: 430, y: 330 },
  trigger: { x: SELECT.x + 70, y: SELECT.y + 20 },
  item: (i: number) => ({ x: MENU.x + 92, y: MENU.y + 4 + 16 + i * 32 + 4 }),
};

// Camera: how far it zooms, and the screen point it centres on while zoomed.
const ZOOM = 1.8;
const FOCUS = { x: MENU.x + MENU.w / 2, y: MENU.y + 60 };
const CAMERA_SPRING = { type: "spring", bounce: 0, visualDuration: 0.7 } as const;

/** Zoom toward `focus`, keeping the screen's edges inside the window. */
function camera(zoom: number) {
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  return {
    scale: zoom,
    x: clamp(SCREEN.w / 2 - zoom * FOCUS.x, SCREEN.w - zoom * SCREEN.w),
    y: clamp(SCREEN.h / 2 - zoom * FOCUS.y, SCREEN.h - zoom * SCREEN.h),
  };
}

const p = SAMPLE_CONTENT.personal;
const FIELDS = [
  ["Full name", p.name],
  ["Headline", p.headline],
  ["Email", p.email],
  ["Phone", p.phone],
  ["City, country", p.location],
  ["LinkedIn", p.linkedin],
] as const;
const SECTIONS = [
  { title: "Summary", status: "31 words", Icon: AlignLeftIcon },
  { title: "Experience", status: "2 roles", Icon: BriefcaseIcon },
  { title: "Education", status: "1 school", Icon: GraduationCapIcon },
  { title: "Skills", status: "6 skills", Icon: WrenchIcon },
  { title: "Projects", status: "1 project", Icon: FolderOpenIcon },
  { title: "Certifications", status: "1 certificate", Icon: AwardIcon },
];

export function TemplateDemo() {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [scale, setScale] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const active = inView && !reduce;
  const next = (index + 1) % TEMPLATE_IDS.length;

  // Fit the fixed-size screen to the window's width.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / SCREEN.w));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      if (phase === "idle") setPhase("aim");
      else if (phase === "aim") setPhase("open");
      else if (phase === "open") setPhase("hover");
      else if (phase === "hover") {
        setIndex(next); // the click: the page switches here
        setPhase("pick");
      } else setPhase("idle");
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [active, phase, next]);

  const id = TEMPLATE_IDS[index];
  const menuOpen = active && (phase === "open" || phase === "hover");
  // In close while the pointer heads for the menu and picks; out again for the result.
  const zoomed = active && (phase === "aim" || phase === "open" || phase === "hover");
  const at =
    !active || phase === "idle"
      ? { ...POINTER.rest, scale: 1 }
      : phase === "aim" || phase === "open"
        ? { ...POINTER.trigger, scale: phase === "open" ? 0.88 : 1 }
        : { ...POINTER.item(phase === "hover" ? next : index), scale: phase === "pick" ? 0.88 : 1 };

  return (
    <div
      role="img"
      aria-label="Screen recording of the Rello editor: the Template menu switches one resume between Classic, Modern, Compact and Minimal"
      className="overflow-hidden rounded-xl border bg-card shadow-[0_40px_80px_-40px_rgb(21_23_28/0.45)]"
    >
      {/* Browser chrome */}
      <div className="flex h-9 items-center gap-3 border-b bg-muted/60 px-3.5 sm:h-10">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="mx-auto w-full max-w-xs truncate rounded-md bg-background/80 px-3 py-0.5 text-center text-[11px] text-muted-foreground sm:text-xs">
          rello.app/r/amara-okafor
        </span>
        <span className="w-[42px]" />
      </div>

      {/* The app, at desktop size, scaled to fill the window */}
      <div ref={frame} className="relative w-full overflow-hidden" style={{ height: SCREEN.h * scale }}>
        <div
          className="absolute top-0 left-0 origin-top-left bg-background"
          style={{
            width: SCREEN.w,
            height: SCREEN.h,
            transform: `scale(${scale})`,
            visibility: scale ? "visible" : "hidden",
          }}
        >
          <motion.div
            className="absolute inset-0 origin-top-left"
            initial={false}
            animate={camera(zoomed ? ZOOM : 1)}
            transition={CAMERA_SPRING}
          >
            {/* Editor header */}
            <div className="flex h-14 items-center gap-3 border-b bg-card px-4">
              <span className="flex size-9 items-center justify-center rounded-lg">
                <ArrowLeftIcon className="size-4" />
              </span>
              <span className="font-heading text-lg font-medium tracking-tight">Amara Okafor</span>
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success/10 px-2 text-xs font-medium text-success">
                <CheckIcon className="size-3.5" />
                Saved
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex h-8 w-[150px] items-center justify-center gap-1.5 rounded-lg border bg-background text-sm font-medium">
                  <AiIcon className="size-4" />
                  Tailor for a job
                </span>
                <span
                  className={cn(
                    "flex h-8 w-[124px] items-center justify-between rounded-lg border bg-background px-2.5 text-sm transition-[border-color,box-shadow] duration-150",
                    menuOpen && "border-ring ring-3 ring-ring/30",
                  )}
                >
                  {TEMPLATES[id].name}
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </span>
                <span className="inline-flex h-8 w-[150px] items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
                  <DownloadIcon className="size-4" />
                  Download PDF
                </span>
              </div>
            </div>

            <div className="flex" style={{ height: SCREEN.h - 56 }}>
              {/* Form panel */}
              <div className="w-[540px] shrink-0 overflow-hidden border-r bg-card">
                <p className="flex items-center gap-2 border-b px-6 py-3 text-xs text-accent-foreground">
                  <CircleCheckIcon className="size-3.5" />
                  Ready to tailor. Use “Tailor for a job” whenever a role catches your eye.
                </p>
                <div className="border-b px-6 pt-4 pb-5">
                  <div className="flex items-center gap-3 pb-4">
                    <UserRoundIcon className="size-4 text-primary" />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-medium">Personal details</span>
                      <span className="text-xs text-muted-foreground">
                        {p.name}, {p.headline}
                      </span>
                    </span>
                    <ChevronUpIcon className="ml-auto size-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                    {FIELDS.map(([label, value]) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="flex h-9 items-center truncate rounded-lg border px-3 text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {SECTIONS.map(({ title, status, Icon }) => (
                  <div key={title} className="flex items-center gap-3 border-b px-6 py-4">
                    <Icon className="size-4 text-primary" />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-medium">{title}</span>
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </span>
                    <ChevronDownIcon className="ml-auto size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>

              {/* Page preview */}
              <div className="relative flex-1 overflow-hidden px-10 pt-10">
                <div className="relative mx-auto aspect-[794/1123] w-full max-w-[540px]">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={id}
                      className="absolute inset-0 overflow-hidden rounded-sm bg-white shadow-page"
                      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.35, ease: EASE_OUT }}
                    >
                      <PagePreview templateId={id} content={SAMPLE_CONTENT} mode="thumb" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Template menu, opened by the pointer */}
            <AnimatePresence>
              {menuOpen && (
                <motion.ul
                  className="absolute z-20 origin-top-right rounded-lg border bg-popover p-1 text-sm shadow-lg"
                  style={{ left: MENU.x, top: MENU.y, width: MENU.w }}
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.14, ease: EASE_OUT }}
                >
                  {TEMPLATE_IDS.map((t, i) => (
                    <li
                      key={t}
                      className={cn(
                        "flex h-8 items-center justify-between rounded-md px-2 transition-colors duration-100",
                        phase === "hover" && i === next && "bg-accent text-accent-foreground",
                      )}
                    >
                      {TEMPLATES[t].name}
                      {i === index && <CheckIcon className="size-4" />}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            {/* The pointer */}
            <motion.span
              className="pointer-events-none absolute top-0 left-0 z-30 text-foreground"
              initial={false}
              animate={{ ...at, opacity: active ? 1 : 0 }}
              transition={{ type: "spring", bounce: 0, visualDuration: 0.35 }}
            >
              <MousePointer2Icon className="size-6 -translate-x-1 -translate-y-1 fill-foreground stroke-background" />
            </motion.span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
