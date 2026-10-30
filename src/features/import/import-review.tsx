"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FileCheckIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { EditorSkeleton } from "@/features/editor/editor";
import type { Update } from "@/features/editor/fields";
import { SECTIONS } from "@/features/editor/sections";
import { parseContent, type ResumeContent } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { PagePreview } from "@/features/templates/page-preview";
import { cn } from "@/lib/utils";
import { IMPORT_KEY, type PendingImport } from "./pending";

function titleFor(content: ResumeContent, fileName: string) {
  const name = content.personal.name.trim();
  if (name) return `${name} — Resume`;
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
      return raw ? (JSON.parse(raw) as PendingImport) : null;
    } catch {
      return null;
    }
  }, [raw]);

  useEffect(() => {
    if (raw !== undefined && !pending) router.replace("/resumes");
  }, [raw, pending, router]);

  if (!pending) return <EditorSkeleton />;
  return <ImportEditor pending={pending} />;
}

function ImportEditor({ pending }: { pending: PendingImport }) {
  const router = useRouter();
  const [content, setContent] = useState(() => parseContent(pending.content));
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");

  const update: Update = (fn) => setContent(fn);

  async function save() {
    if (saving) return;
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
      toast.add({ title: "Couldn't save", description: "Nothing was lost — try again.", type: "error" });
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
          <p className="truncate font-heading text-lg leading-tight font-medium tracking-tight">Check your import</p>
          <p className="truncate text-xs text-muted-foreground">From {pending.fileName} · not saved yet</p>
        </div>
        <Button variant="ghost" onClick={discard} disabled={saving}>
          Discard
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner data-icon="inline-start" /> : <FileCheckIcon data-icon="inline-start" />}
          Save resume
        </Button>
      </header>

      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <Alert className="border-primary/25 bg-accent/40">
          <AlertTitle>Check every section before saving</AlertTitle>
          <AlertDescription>
            {pending.sample
              ? "This is a rough sample read (no AI key set), so most details will need filling in."
              : "Imports aren't always perfect — fix anything that came through wrong or is missing."}
            {pending.truncated && " Your file was long, so only the first part was read."}
          </AlertDescription>
        </Alert>
      </div>

      <div className="border-b bg-card px-4 py-2 lg:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as "edit" | "preview")}>
          <TabsList className="w-full">
            <TabsTrigger value="edit">Check details</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
