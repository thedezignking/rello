"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { ResumeContent, TemplateId } from "@/features/resumes/schema";
import { ResumeDocument } from "@/features/templates";
import { PAGE_WIDTH } from "@/features/templates/parts";

export type PrintPayload = { templateId: TemplateId; content: ResumeContent };

declare global {
  interface Window {
    /** Called by the export route. Resolves once the page is ready to print. */
    __relloRender?: (payload: PrintPayload) => Promise<void>;
  }
}

export function PrintView() {
  const [payload, setPayload] = useState<PrintPayload | null>(null);

  useEffect(() => {
    window.__relloRender = async (next) => {
      // Becomes the PDF's document title.
      document.title = next.content.personal.name ? `${next.content.personal.name} — Resume` : "Resume";
      flushSync(() => setPayload(next));
      await document.fonts.ready;
    };
    document.documentElement.dataset.printReady = "true";
    return () => {
      delete window.__relloRender;
    };
  }, []);

  return (
    <div className="print-root min-h-dvh bg-white">
      <style>{`
        @page { size: A4; margin: 14mm 0; }
        html, body { background: #fff !important; }
      `}</style>
      {payload && (
        <div style={{ width: PAGE_WIDTH }} className="mx-auto">
          <ResumeDocument templateId={payload.templateId} content={payload.content} />
        </div>
      )}
    </div>
  );
}
