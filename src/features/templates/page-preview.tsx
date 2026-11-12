"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ResumeContent, TemplateId } from "@/features/resumes/schema";
import { ResumeDocument } from "./index";
import { PAGE_HEIGHT, PAGE_WIDTH, PRINT_MARGIN } from "./parts";

/**
 * Renders a resume at true A4 size and scales it to the container's width.
 * `mode="page"` shows the whole document with page-break guides.
 * `mode="thumb"` crops to the first page, for cards.
 */
export function PagePreview({
  templateId,
  content,
  mode = "page",
  hints,
  onSectionClick,
  highlight,
  onLineClick,
  className,
}: {
  templateId: TemplateId;
  content: ResumeContent;
  mode?: "page" | "thumb";
  hints?: boolean;
  onSectionClick?: (section: string) => void;
  /** Marks lines (by data-line id) like a highlighter; `active` gets a stronger mark. */
  highlight?: { ids: string[]; active?: string[] };
  onLineClick?: (lineId: string) => void;
  className?: string;
}) {
  const scope = useId();
  const frame = useRef<HTMLDivElement>(null);
  const doc = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [docHeight, setDocHeight] = useState(PAGE_HEIGHT);

  useLayoutEffect(() => {
    const f = frame.current;
    const d = doc.current;
    if (!f || !d) return;
    const measure = () => {
      setScale(f.clientWidth / PAGE_WIDTH);
      setDocHeight(Math.max(PAGE_HEIGHT, d.scrollHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(f);
    ro.observe(d);
    return () => ro.disconnect();
  }, []);

  // Mirrors the PDF: each printed page holds PAGE_HEIGHT minus its top and
  // bottom margins, and the template's own padding stands in for the first
  // page's top margin. Real breaks can land a little earlier because
  // entries avoid splitting across pages.
  const contentPerPage = PAGE_HEIGHT - 2 * PRINT_MARGIN;
  const pages = Math.max(1, Math.ceil((docHeight - 2 * PRINT_MARGIN) / contentPerPage));
  const breakAt = (i: number) => PRINT_MARGIN + (i + 1) * contentPerPage;
  const height = mode === "thumb" ? PAGE_HEIGHT : pages * PAGE_HEIGHT;

  function handleClick(e: React.MouseEvent) {
    const el = e.target as HTMLElement;
    if (onLineClick) {
      const line = el.closest<HTMLElement>("[data-line]");
      if (line?.dataset.line) return onLineClick(line.dataset.line);
    }
    if (!onSectionClick) return;
    const target = el.closest<HTMLElement>("[data-section]");
    if (target?.dataset.section) onSectionClick(target.dataset.section);
  }

  // <style> is global and several previews can share a page, so every rule
  // is scoped to this preview. Escaping is hand-rolled rather than CSS.escape
  // so server and browser render the same <style> (no hydration mismatch).
  const esc = (v: string) => v.replace(/["\\]/g, "\\$&");
  const sel = (ids: string[]) =>
    ids.map((id) => `[data-preview="${esc(scope)}"] [data-line="${esc(id)}"]`).join(",");
  const highlightCss =
    highlight
      ? [
          highlight.ids.length &&
            `${sel(highlight.ids)}{background:linear-gradient(transparent 8%,var(--paper-mark-soft) 8%,var(--paper-mark-soft) 92%,transparent 92%);cursor:pointer;border-radius:2px;transition:background .15s}`,
          highlight.active?.length &&
            `${sel(highlight.active)}{background:linear-gradient(transparent 8%,var(--paper-mark) 8%,var(--paper-mark) 92%,transparent 92%)}`,
        ]
          .filter(Boolean)
          .join("")
      : "";

  return (
    <div
      ref={frame}
      className={cn("relative w-full overflow-hidden bg-white", className)}
      style={{ height: scale ? height * scale : undefined, aspectRatio: scale ? undefined : `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      <div
        ref={doc}
        data-preview={scope}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const line = (event.target as HTMLElement).closest<HTMLElement>('[data-line][role="button"]');
          if (line?.dataset.line && onLineClick) {
            event.preventDefault();
            onLineClick(line.dataset.line);
          }
        }}
        className={cn(
          "absolute top-0 left-0 origin-top-left bg-white text-left",
          onSectionClick &&
            "[&_[data-section]]:cursor-pointer [&_[data-section]]:rounded-sm [&_[data-section]]:transition-colors [&_[data-section]:hover]:bg-[#2546c8]/[0.04]",
        )}
        style={{
          width: PAGE_WIDTH,
          minHeight: PAGE_HEIGHT,
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
        aria-hidden={mode === "thumb" || undefined}
      >
        {highlightCss && <style>{highlightCss}</style>}
        <ResumeDocument templateId={templateId} content={content} hints={hints} plain={mode === "thumb"} />
      </div>

      {mode === "page" &&
        Array.from({ length: pages - 1 }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 flex items-center gap-2"
            style={{ top: breakAt(i) * scale }}
          >
            <span className="h-px flex-1 border-t border-dashed border-[#2546c8]/35" />
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Page {i + 2}
            </span>
            <span className="h-px w-4 border-t border-dashed border-[#2546c8]/35" />
          </div>
        ))}
    </div>
  );
}
