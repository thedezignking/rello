"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ImportButton } from "@/features/import/import-button";
import { Hero, HowItWorks } from "./landing";
import { useDownloadPdf } from "@/features/pdf/use-download-pdf";
import { TEMPLATE_IDS, type TemplateId } from "@/features/resumes/schema";
import { getResumeStore, type ResumeSummary } from "@/features/resumes/store";
import { TEMPLATES } from "@/features/templates";
import { PagePreview } from "@/features/templates/page-preview";
import { SAMPLE_CONTENT } from "@/features/templates/sample";
import { timeAgo } from "@/lib/time";

export function HomeView() {
  const router = useRouter();
  const { isGuest, openSignIn } = useAuth();
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [creating, setCreating] = useState<TemplateId | "blank" | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    getResumeStore()
      .list()
      .then(setResumes)
      .catch(() => {
        setResumes([]);
        toast.add({ title: "Couldn't load your resumes", description: "Refresh the page to try again.", type: "error" });
      });
  }, []);

  useEffect(load, [load]);

  async function create(choice: TemplateId | "blank") {
    if (creating) return;
    setCreating(choice);
    try {
      const resume = await getResumeStore().create({
        templateId: choice === "blank" ? "classic" : choice,
      });
      router.push(`/r/${resume.id}`);
    } catch {
      setCreating(null);
      toast.add({ title: "Couldn't create a resume", description: "Check your connection and try again.", type: "error" });
    }
  }

  const originals = resumes?.filter((r) => !r.sourceResumeId) ?? [];
  const firstVisit = resumes?.length === 0;
  const ResumesHeading = firstVisit ? "h2" : "h1";

  function startTailor() {
    if (originals.length === 1) router.push(`/r/${originals[0].id}/tailor`);
    else setPicking(true);
  }

  return (
    <main className="pb-20">
      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Which resume should we tailor?</DialogTitle>
          </DialogHeader>
          <ul className="-mx-1 flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {originals.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/r/${r.id}/tailor`}
                  className="flex items-center gap-3 rounded-lg p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="w-10 shrink-0 overflow-hidden rounded-sm border">
                    <PagePreview templateId={r.templateId} content={r.content} mode="thumb" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="block text-xs text-muted-foreground">Edited {timeAgo(r.updatedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {firstVisit && <Hero onStart={() => create("blank")} starting={creating === "blank"} />}

      <section id="start" className="border-b bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Start a new resume</h2>
            <ImportButton />
          </div>
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
            <li className="w-[132px] shrink-0 snap-start sm:w-auto">
              <StartCard label="Blank" onClick={() => create("blank")} busy={creating === "blank"}>
                <div className="flex aspect-[794/1123] items-center justify-center bg-white">
                  <PlusIcon className="size-10 text-primary" strokeWidth={1.5} />
                </div>
              </StartCard>
            </li>
            {TEMPLATE_IDS.map((id) => (
              <li key={id} className="w-[132px] shrink-0 snap-start sm:w-auto">
                <StartCard
                  label={TEMPLATES[id].name}
                  hint={TEMPLATES[id].blurb}
                  onClick={() => create(id)}
                  busy={creating === id}
                >
                  <PagePreview templateId={id} content={SAMPLE_CONTENT} mode="thumb" />
                </StartCard>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          {/* The hero owns the page's h1 on a first visit. */}
          <ResumesHeading className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
            Your resumes
          </ResumesHeading>
          {originals.length > 0 && (
            <Button onClick={startTailor}>
              <SparklesIcon data-icon="inline-start" />
              Tailor to a job
            </Button>
          )}
        </div>

        {isGuest && resumes && resumes.length > 0 && (
          <Alert className="mb-6">
            <AlertTitle>Saved in this browser only</AlertTitle>
            <AlertDescription>
              Sign in to keep your resumes safe and open them on any device.
            </AlertDescription>
            <AlertAction>
              <Button size="sm" onClick={() => openSignIn("Keep your resumes safe and open them anywhere.")}>
                Sign in
              </Button>
            </AlertAction>
          </Alert>
        )}

        {resumes === null ? (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[794/1123] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))}
          </ul>
        ) : resumes.length === 0 ? (
          <Empty className="rounded-xl border border-dashed bg-card py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>Your next opportunity starts with one resume.</EmptyTitle>
              <EmptyDescription>
                Pick a template above, or start blank. You can switch templates any time.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {resumes.map((r) => (
              <ResumeCard key={r.id} resume={r} onChanged={load} />
            ))}
          </ul>
        )}
      </section>

      {firstVisit && <HowItWorks />}
    </main>
  );
}

function StartCard({
  label,
  hint,
  busy,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  busy?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="group flex w-full flex-col gap-2 rounded-lg text-left outline-none"
    >
      <span className="relative block overflow-hidden rounded-lg border border-border shadow-page transition-[border-color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:border-primary group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
        {children}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner />
          </span>
        )}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function ResumeCard({ resume, onChanged }: { resume: ResumeSummary; onChanged: () => void }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(resume.title);
  const { download, busyId } = useDownloadPdf();

  async function duplicate() {
    try {
      await getResumeStore().duplicate(resume.id);
      toast.add({ title: "Duplicated", description: `${resume.title} (copy)`, type: "success" });
      onChanged();
    } catch {
      toast.add({ title: "Couldn't duplicate", description: "Try again in a moment.", type: "error" });
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const next = title.trim() || "Untitled resume";
    setRenaming(false);
    if (next === resume.title) return;
    try {
      await getResumeStore().update(resume.id, { title: next });
      onChanged();
    } catch {
      toast.add({ title: "Couldn't rename", description: "Try again in a moment.", type: "error" });
    }
  }

  async function remove() {
    setDeleting(false);
    try {
      await getResumeStore().remove(resume.id);
      toast.add({ title: "Deleted", description: resume.title, type: "success" });
      onChanged();
    } catch {
      toast.add({ title: "Couldn't delete", description: "Try again in a moment.", type: "error" });
    }
  }

  return (
    <li className="group relative flex flex-col gap-2.5">
      <div className="relative">
        <Link
          href={`/r/${resume.id}`}
          className="block overflow-hidden rounded-lg border border-border shadow-page transition-[border-color,transform] duration-150 outline-none hover:-translate-y-0.5 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Open ${resume.title}`}
        >
          <PagePreview templateId={resume.templateId} content={resume.content} mode="thumb" />
        </Link>
        {/* Quick action: shows on hover or keyboard focus; always on touch screens. */}
        {!resume.sourceResumeId && (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/r/${resume.id}/tailor`} />}
            aria-label={`Tailor ${resume.title} to a job`}
            className="absolute inset-x-3 bottom-3 opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <SparklesIcon data-icon="inline-start" />
            Tailor to a job
          </Button>
        )}
      </div>

      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{resume.title}</p>
          <p className="text-xs text-muted-foreground">
            {resume.sourceResumeId ? (
              <span className="mr-1 rounded-sm bg-highlight-soft px-1 py-px font-medium text-foreground">Tailored</span>
            ) : (
              `${TEMPLATES[resume.templateId].name} · `
            )}
            Edited {timeAgo(resume.updatedAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="-mr-1.5" aria-label={`More actions for ${resume.title}`} />
            }
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push(`/r/${resume.id}`)}>
                <FileTextIcon />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/r/${resume.id}/tailor`)}>
                <SparklesIcon />
                {resume.sourceResumeId ? "Review suggestions" : "Tailor for a job"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTitle(resume.title);
                  setRenaming(true);
                }}
              >
                <PencilIcon />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={duplicate}>
                <CopyIcon />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download(resume)} disabled={busyId === resume.id}>
                <DownloadIcon />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <form onSubmit={rename} className="contents">
            <DialogHeader>
              <DialogTitle>Rename resume</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`rename-${resume.id}`}>Name</FieldLabel>
              <Input
                id={`rename-${resume.id}`}
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit">Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{resume.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the resume for good. Tailored copies made from it stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
