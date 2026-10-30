"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import type { ResumeContent, TemplateId } from "@/features/resumes/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { pdfFilename } from "./filename";

type Exportable = { id: string; title: string; templateId: TemplateId; content: ResumeContent };

const FAILED = "We couldn't prepare your PDF. Your resume is still saved.";

export function useDownloadPdf() {
  const { requireAccount } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * `beforeExport` runs first (the editor uses it to save pending edits) and
   * can cancel the download by returning false.
   */
  async function download(resume: Exportable, beforeExport?: () => Promise<boolean>) {
    if (busyId) return;
    const remote = isSupabaseConfigured();
    if (remote && !(await requireAccount("Sign in to download your resume as a PDF."))) return;

    setBusyId(resume.id);
    try {
      if (beforeExport && !(await beforeExport())) {
        toast.add({
          title: "Your latest changes aren't saved yet",
          description: "Fix the save problem shown at the top, then download again.",
          type: "error",
        });
        return;
      }

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // With Supabase the server reads the saved resume itself; the local
        // development store only lives in this browser, so send it along.
        body: JSON.stringify(
          remote
            ? { id: resume.id }
            : { id: resume.id, title: resume.title, templateId: resume.templateId, content: resume.content },
        ),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.add({ title: "Download failed", description: body?.error?.message ?? FAILED, type: "error" });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFilename(resume.content.personal.name, resume.title);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.add({ title: "Download failed", description: FAILED, type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return { download, busyId };
}
