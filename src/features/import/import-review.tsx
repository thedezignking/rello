"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ViewTabs } from "@/components/view-tabs";
import { EditorSkeleton } from "@/features/editor/editor";
import type { Update } from "@/features/editor/fields";
import { SECTIONS } from "@/features/editor/sections";
import { downloadRecovery, ResumeReadError } from "@/features/resumes/recovery";
import {
  parseContent,
  ResumeContentError,
  resumeContentSchema,
  type ResumeContent,
} from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { PagePreview } from "@/features/templates/page-preview";
import { cn } from "@/lib/utils";
import { FileCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { IMPORT_KEY, type PendingImport } from "./pending";

function titleFor(content: ResumeContent, fileName: string) {
  const name = content.personal.name.trim();
  if (name) return `${name}, resume`;
  return fileName.replace(/\.(pdf|docx)$/i, "") || "Imported resume";
}

const noSubscribe = () => () => {};

export function ImportReview() {
  const router = useRouter();
  // undefined while server-rendering, then the stored import (or null) in the browser.
  const raw = useSyncExternalStore(
    noSubscribe,
    () => sessionStorage.getItem(IMPORT_KEY),
    () => undefined,
  );
  const pending = useMemo(() => {
    try {
      if (!raw) return null;
      const value = JSON.parse(raw) as PendingImport;
      if (!value || typeof value.fileName !== "string" || !("content" in value))
        throw new ResumeContentError(raw);
      return { value, content: parseContent(value.content) };
    } catch {
      return { error: new ResumeContentError(raw) };
    }
  }, [raw]);

  useEffect(() => {
    if (raw !== undefined && !pending) router.replace("/resumes");
  }, [raw, pending, router]);

  if (!pending) return <EditorSkeleton />;
  if ("error" in pending) return <ResumeReadError error={pending.error} onRetry={() => location.reload()} />;
  return <ImportEditor pending={pending.value} initialContent={pending.content} />;
}

function ImportEditor({
  pending,
  initialContent,
}: {
  pending: PendingImport;
  initialContent: ResumeContent;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const latest = useRef(initialContent);
  const [checkpointFailed, setCheckpointFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");

  const update: Update = (fn) => {
    const next = fn(latest.current);
    latest.current = next;
    setContent(next);
    try {
      sessionStorage.setItem(IMPORT_KEY, JSON.stringify({ ...pending, content: next }));
      setCheckpointFailed(false);
    } catch {
      setCheckpointFailed(true);
    }
  };

  useEffect(() => {
    if (!checkpointFailed) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [checkpointFailed]);
  const valid = resumeContentSchema.safeParse(content).success;

  async function save() {
    if (saving || !valid) return;
    setSaving(true);
    try {
      const resume = await getResumeStore().create({
        title: titleFor(content, pending.fileName),
        templateId: "classic",
        content,
      });
      sessionStorage.removeItem(IMPORT_KEY);
      toast.add({ title: "Resume saved", description: "You can keep editing it here.", type: "success" });
      router.replace(`/r/${resume.id}`);
    } catch {
      setSaving(false);
      toast.add({
        title: "Couldn't save",
        description: "Your corrections are still on this page. Try again.",
        type: "error",
      });
    }
  }

  function discard() {
    sessionStorage.removeItem(IMPORT_KEY);
    router.replace("/resumes");
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg leading-tight font-medium tracking-tight">
            Check your import
          </p>
          <p className="truncate text-xs text-muted-foreground">From {pending.fileName} · not saved yet</p>
        </div>
        <Button variant="ghost" onClick={discard} disabled={saving}>
          Discard
        </Button>
        <Button onClick={save} disabled={saving || !valid}>
          {saving ? <Spinner data-icon="inline-start" /> : <FileCheckIcon data-icon="inline-start" />}
          Save resume
        </Button>
      </header>

      <div className="border-b bg-card px-4 py-3 sm:px-6">
        {(!valid || checkpointFailed) && (
          <Alert variant="destructive" className="mb-3">
            <AlertTitle>
              {!valid ? "Check the highlighted fields" : "Couldn't keep a recovery draft"}
            </AlertTitle>
            <AlertDescription>
              {!valid
                ? "Some imported fields are too long. Your text has been kept; shorten those fields before saving."
                : "Keep this page open until you save your resume. Your latest corrections couldn't be kept for a reload."}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-fit"
              onClick={() => downloadRecovery(content)}
            >
              Download recovery copy
            </Button>
          </Alert>
        )}
        <Alert className="border-primary/25 bg-accent/40">
          <AlertTitle>Check every section before saving</AlertTitle>
          <AlertDescription>
            {pending.sample
              ? "This is a rough sample read (no AI key set), so most details will need filling in."
              : "Imports aren't always perfect. Fix anything that came through wrong or is missing."}
            {pending.truncated && " Your file was long, so only the first part was read."}
          </AlertDescription>
        </Alert>
      </div>

      <ViewTabs
        value={view}
        onChange={setView}
        items={[
          { value: "edit", label: "Check details" },
          { value: "preview", label: "Preview" },
        ]}
      />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "w-full overflow-y-auto border-r bg-card lg:block lg:w-[min(520px,46%)]",
            view === "preview" && "hidden",
          )}
        >
          <Accordion multiple defaultValue={SECTIONS.map((s) => s.key)} className="pb-24">
            {SECTIONS.map(({ key, title, Body, count }) => {
              const n = count?.(content) ?? 0;
              return (
                <AccordionItem key={key} value={key} className="px-4 sm:px-6">
                  <AccordionTrigger className="py-4 text-[15px] hover:no-underline">
                    <span className="flex items-center gap-2">
                      {title}
                      {n > 0 && (
                        <Badge variant="secondary" className="tabular-nums">
                          {n}
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <Body content={content} update={update} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <div className={cn("min-w-0 flex-1 overflow-y-auto", view === "edit" && "hidden lg:block")}>
          <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-8 sm:py-10">
            <PagePreview templateId="classic" content={content} hints className="rounded-sm shadow-page" />
          </div>
        </div>
      </div>
    </div>
  );
}
