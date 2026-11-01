"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CloudCheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CloudOffIcon,
  DownloadIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { AiIcon } from "@/components/ai-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ViewTabs } from "@/components/view-tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { useDownloadPdf } from "@/features/pdf/use-download-pdf";
import { isReadyForTailoring, TEMPLATE_IDS, type Resume, type SectionKey, type TemplateId } from "@/features/resumes/schema";
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
          <Button nativeButton={false} render={<Link href="/resumes" />}>Back to your resumes</Button>
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
    <div className="page-in flex h-dvh flex-col">
      <GuestNotice />
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/resumes" />} aria-label="Back to your resumes">
          <ArrowLeftIcon />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={200}
            aria-label="Resume name"
            className="-mx-1.5 h-8 max-w-md min-w-[6ch] truncate rounded-md bg-transparent px-1.5 field-sizing-content font-heading text-lg leading-none font-medium tracking-tight outline-none hover:bg-muted focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <SaveIndicator status={status} onRetry={retry} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/r/${resume.id}/tailor`} />}
            aria-label={resume.sourceResumeId ? "Review suggestions" : "Tailor for a job"}
          >
            <AiIcon data-icon="inline-start" />
            <span className="hidden md:inline">{resume.sourceResumeId ? "Suggestions" : "Tailor for a job"}</span>
          </Button>
          <Select
            value={templateId}
            onValueChange={(v) => v && changeTemplate(v as TemplateId)}
            items={TEMPLATE_IDS.map((t) => ({ value: t, label: TEMPLATES[t].name }))}
          >
            <SelectTrigger aria-label="Template" className="w-fit">
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


      <ViewTabs
        value={view}
        onChange={setView}
        items={[
          { value: "edit", label: "Edit" },
          { value: "preview", label: "Preview" },
        ]}
      />

      <div className="flex min-h-0 flex-1">
        <div
          ref={formRef}
          className={cn(
            "w-full overflow-y-auto border-r bg-card lg:block lg:w-[min(540px,46%)]",
            view === "preview" && "hidden",
          )}
        >
          <ReadinessNote ready={isReadyForTailoring(content)} />
          <ImproveProvider value={{ resumeId: resume.id, content }}>
            <Accordion
              multiple
              value={open}
              onValueChange={(v) => setOpen(v as string[])}
              className="pb-24"
            >
              {SECTIONS.map(({ key, title, Icon, Body, status: describe }) => {
                const s = describe(content);
                return (
                  <AccordionItem
                    key={key}
                    value={key}
                    id={`section-${key}`}
                    className="border-b"
                  >
                    <AccordionTrigger className="items-center px-4 py-4 text-[15px] hover:no-underline sm:px-6">
                      <span className="flex items-center gap-3">
                        <Icon
                          className={cn("size-4 shrink-0", s.done ? "text-primary" : "text-muted-foreground")}
                        />
                        <span className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{title}</span>
                          <span className="text-xs font-normal text-muted-foreground tabular-nums">{s.label}</span>
                        </span>
                      </span>
                    </AccordionTrigger>
                    {/* Side padding inside the panel, which clips its overflow, so input focus rings aren't cut off. */}
                    <AccordionContent className="px-4 pb-5 sm:px-6">
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

/** Top-of-form note: whether there's enough on the resume to tailor it. */
function ReadinessNote({ ready }: { ready: boolean }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 border-b px-4 py-3 text-xs sm:px-6",
        ready ? "text-accent-foreground" : "text-muted-foreground",
      )}
    >
      {ready ? <CircleCheckIcon className="size-3.5 shrink-0" /> : <CircleDashedIcon className="size-3.5 shrink-0" />}
      {ready
        ? "Ready to tailor. Use “Tailor for a job” whenever a role catches your eye."
        : "Add your name, one role, school or project, and a few skills to start tailoring."}
    </p>
  );
}

/**
 * Save state as a status chip beside the title, like a document app: a calm
 * green "Saved", a neutral "Saving…", and red when something needs you. One
 * element whose colours transition, so state changes read as feedback rather
 * than text appearing and disappearing. Icon-only on phones for calm states.
 */
export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const problem = status === "error" || status === "conflict";
  const busy = status === "saving" || status === "unsaved";
  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200",
        problem ? "px-2" : "w-6 justify-center sm:w-auto sm:px-2",
        problem
          ? "bg-destructive/10 text-destructive"
          : busy
            ? "bg-muted text-muted-foreground"
            : "bg-success/10 text-success",
      )}
    >
      {busy ? (
        <>
          <Spinner className="size-3" />
          <span className="sr-only sm:not-sr-only">Saving…</span>
        </>
      ) : status === "error" ? (
        <>
          <CloudOffIcon className="pop-in size-3.5" />
          Couldn&apos;t save
          <button type="button" className="underline underline-offset-2 hover:no-underline" onClick={onRetry}>
            Retry
          </button>
        </>
      ) : status === "conflict" ? (
        <>
          <TriangleAlertIcon className="pop-in size-3.5" />
          Changed in another tab
          <button type="button" className="underline underline-offset-2 hover:no-underline" onClick={() => location.reload()}>
            Reload
          </button>
        </>
      ) : (
        <>
          <CloudCheckIcon className="pop-in size-3.5" />
          <span className="sr-only sm:not-sr-only">Saved</span>
        </>
      )}
    </span>
  );
}

const NOTICE_KEY = "rello.guestNoticeClosed";
const NOTICE_EVENT = "rello-guest-notice";

function subscribeNotice(onChange: () => void) {
  window.addEventListener(NOTICE_EVENT, onChange);
  return () => window.removeEventListener(NOTICE_EVENT, onChange);
}

function noticeClosed() {
  try {
    return sessionStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Announcement bar across the top for guests: their work lives only in this
 * browser. Closing it hides it for this visit; it returns next time, since
 * the risk hasn't gone away.
 */
function GuestNotice() {
  const { isGuest, openSignIn } = useAuth();
  // Hidden on the server and until we know, so it never flashes for someone who closed it.
  const closed = useSyncExternalStore(subscribeNotice, noticeClosed, () => true);
  if (!isGuest || closed) return null;
  return (
    <div className="relative flex min-h-10 items-center justify-center bg-primary px-12 py-2 text-center text-sm text-primary-foreground">
      <p>
        Saved in this browser only.{" "}
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:no-underline"
          onClick={() => openSignIn("Keep this resume safe and open it on any device.")}
        >
          Sign in to keep it
        </button>
        <span className="hidden sm:inline">, or keep editing and do it later.</span>
      </p>
      <button
        type="button"
        aria-label="Close this notice"
        onClick={() => {
          try {
            sessionStorage.setItem(NOTICE_KEY, "1");
          } catch {}
          window.dispatchEvent(new Event(NOTICE_EVENT));
        }}
        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md opacity-80 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
      >
        <XIcon className="size-4" />
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
      {/* Same shape as the loaded editor: a flat list of section rows beside the page. */}
      <div className="flex min-h-0 flex-1">
        <div className="w-full border-r bg-card lg:w-[min(540px,46%)]">
          <div className="border-b px-4 py-3 sm:px-6">
            <Skeleton className="h-3.5 w-64" />
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b px-4 py-4 sm:px-6">
              <Skeleton className="size-4 rounded" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-1 overflow-hidden lg:block">
          <div className="mx-auto w-full max-w-[820px] px-8 py-10">
            <Skeleton className="aspect-[794/1123] w-full rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
