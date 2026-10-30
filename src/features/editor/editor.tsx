"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, CloudOffIcon, DownloadIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { useDownloadPdf } from "@/features/pdf/use-download-pdf";
import { TEMPLATE_IDS, type Resume, type SectionKey, type TemplateId } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { TEMPLATES } from "@/features/templates";
import { PagePreview } from "@/features/templates/page-preview";
import { cn } from "@/lib/utils";
import { ImproveProvider } from "./improve";
import { SECTIONS } from "./sections";
import { useAutosave, type SaveStatus } from "./use-autosave";

export function Editor({ id }: { id: string }) {
  const [state, setState] = useState<{ resume: Resume | null; loaded: boolean }>({ resume: null, loaded: false });

  useEffect(() => {
    let alive = true;
    getResumeStore()
      .get(id)
      .then((resume) => alive && setState({ resume, loaded: true }))
      .catch(() => alive && setState({ resume: null, loaded: true }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (!state.loaded) return <EditorSkeleton />;
  if (!state.resume) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>We couldn&apos;t find this resume</EmptyTitle>
            <EmptyDescription>It may have been deleted, or it belongs to another account.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link href="/" />}>Back to your resumes</Button>
        </Empty>
      </div>
    );
  }
  return <Workspace resume={state.resume} />;
}

function Workspace({ resume }: { resume: Resume }) {
  const { content, setContent, status, retry, flush } = useAutosave(resume);
  const { download, busyId } = useDownloadPdf();
  const [title, setTitle] = useState(resume.title);
  const savedTitle = useRef(resume.title);
  const [templateId, setTemplateId] = useState<TemplateId>(resume.templateId);
  const [open, setOpen] = useState<string[]>(["personal"]);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const formRef = useRef<HTMLDivElement>(null);

  async function saveTitle() {
    const next = title.trim() || "Untitled resume";
    setTitle(next);
    if (next === savedTitle.current) return;
    savedTitle.current = next;
    await getResumeStore()
      .update(resume.id, { title: next })
      .catch(() => toast.add({ title: "Couldn't rename", description: "Try again in a moment.", type: "error" }));
  }

  async function changeTemplate(next: TemplateId) {
    setTemplateId(next);
    await getResumeStore()
      .update(resume.id, { templateId: next })
      .catch(() =>
        toast.add({ title: "Couldn't switch template", description: "Try again in a moment.", type: "error" }),
      );
  }

  // Clicking a section on the page opens its fields.
  function jumpTo(section: string) {
    setView("edit");
    setOpen((o) => (o.includes(section) ? o : [...o, section]));
    requestAnimationFrame(() =>
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-2 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/" />} aria-label="Back to your resumes">
          <ArrowLeftIcon />
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={200}
          aria-label="Resume name"
          className="h-8 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 font-heading text-lg font-medium tracking-tight outline-none hover:bg-muted focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-sm"
        />
        <SaveIndicator status={status} onRetry={retry} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/r/${resume.id}/tailor`} />}
            aria-label={resume.sourceResumeId ? "Review suggestions" : "Tailor for a job"}
          >
            <SparklesIcon data-icon="inline-start" />
            <span className="hidden md:inline">{resume.sourceResumeId ? "Suggestions" : "Tailor for a job"}</span>
          </Button>
          <Select
            value={templateId}
            onValueChange={(v) => v && changeTemplate(v as TemplateId)}
            items={TEMPLATE_IDS.map((t) => ({ value: t, label: TEMPLATES[t].name }))}
          >
            <SelectTrigger aria-label="Template" className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {TEMPLATE_IDS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPLATES[t].name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            onClick={() =>
              download({ id: resume.id, title, templateId, content }, async () => {
                await saveTitle();
                return flush();
              })
            }
            disabled={busyId === resume.id}
            aria-label="Download PDF"
          >
            {busyId === resume.id ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
            <span className="hidden sm:inline">{busyId === resume.id ? "Preparing PDF…" : "Download PDF"}</span>
          </Button>
        </div>
      </header>

      <GuestNotice />

      <div className="border-b bg-card px-4 py-2 lg:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as "edit" | "preview")}>
          <TabsList className="w-full">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={formRef}
          className={cn(
            "w-full overflow-y-auto border-r bg-card lg:block lg:w-[min(520px,46%)]",
            view === "preview" && "hidden",
          )}
        >
          <ImproveProvider value={{ resumeId: resume.id, content }}>
          <Accordion multiple value={open} onValueChange={(v) => setOpen(v as string[])} className="pb-24">
            {SECTIONS.map(({ key, title, Body, count }) => {
              const n = count?.(content) ?? 0;
              return (
                <AccordionItem key={key} value={key} id={`section-${key}`} className="scroll-mt-2 px-4 sm:px-6">
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
                    <Body content={content} update={setContent} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          </ImproveProvider>
        </div>

        <div className={cn("min-w-0 flex-1 overflow-y-auto", view === "edit" && "hidden lg:block")}>
          <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-8 sm:py-10">
            <PagePreview
              templateId={templateId}
              content={content}
              hints
              onSectionClick={(s) => jumpTo(s as SectionKey)}
              className="rounded-sm shadow-page"
            />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Click any part of the page to edit it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  // Icon-only on phones for the calm states; problems are always spelled out.
  const base = "flex shrink-0 items-center gap-1.5 text-xs";
  if (status === "saving" || status === "unsaved")
    return (
      <span role="status" className={cn(base, "text-muted-foreground")}>
        <Spinner className="size-3" />
        <span className="sr-only sm:not-sr-only">Saving…</span>
      </span>
    );
  if (status === "error")
    return (
      <span role="status" className={cn(base, "text-destructive")}>
        <CloudOffIcon className="size-3.5" />
        Couldn&apos;t save
        <Button variant="link" size="xs" className="h-auto px-0" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  if (status === "conflict")
    return (
      <span role="status" className={cn(base, "text-destructive")}>
        <TriangleAlertIcon className="size-3.5" />
        Changed in another tab
        <Button variant="link" size="xs" className="h-auto px-0" onClick={() => location.reload()}>
          Reload
        </Button>
      </span>
    );
  return (
    <span role="status" className={cn(base, "text-muted-foreground")}>
      <CheckIcon className="size-3.5" />
      <span className="sr-only sm:not-sr-only">Saved</span>
    </span>
  );
}

function GuestNotice() {
  const { isGuest, openSignIn } = useAuth();
  if (!isGuest) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground">
      Saved in this browser only.
      <button
        type="button"
        className="font-medium underline underline-offset-2"
        onClick={() => openSignIn("Keep this resume safe and open it on any device.")}
      >
        Sign in to keep it
      </button>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-1">
        <div className="hidden w-[min(520px,46%)] flex-col gap-4 border-r bg-card p-6 lg:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1 p-10">
          <Skeleton className="mx-auto aspect-[794/1123] w-full max-w-[760px]" />
        </div>
      </div>
    </div>
  );
}
