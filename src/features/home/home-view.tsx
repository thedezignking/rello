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
  Trash2Icon,
} from "lucide-react";
import { AiIcon } from "@/components/ai-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  EmptyContent,
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
  const tailored = resumes?.filter((r) => r.sourceResumeId) ?? [];
  const byId = new Map((resumes ?? []).map((r) => [r.id, r]));
  const copiesOf = (id: string) => tailored.filter((r) => r.sourceResumeId === id).length;

  function startTailor() {
    if (originals.length === 1) router.push(`/r/${originals[0].id}/tailor`);
    else setPicking(true);
  }

  return (
    <main className="page-in pb-20">
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


      <section id="start">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Start a new resume</h2>
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-[repeat(6,minmax(0,1fr))] sm:overflow-visible sm:px-0 lg:grid-cols-[repeat(6,minmax(0,148px))]">
            <li className="stagger-in w-[116px] shrink-0 snap-start sm:w-auto" style={{ "--i": 0 } as React.CSSProperties}>
              <StartCard label="Blank" onClick={() => create("blank")} busy={creating === "blank"}>
                <div className="flex aspect-[794/1123] items-center justify-center bg-white">
                  <PlusIcon className="size-8 text-primary" strokeWidth={1.5} />
                </div>
              </StartCard>
            </li>
            {/* Second, beside Blank: bringing the resume you already have is the fastest start. */}
            <li className="stagger-in w-[116px] shrink-0 snap-start sm:w-auto" style={{ "--i": 1 } as React.CSSProperties}>
              <ImportButton variant="tile" />
            </li>
            {TEMPLATE_IDS.map((id, i) => (
              <li
                key={id}
                className="stagger-in w-[116px] shrink-0 snap-start sm:w-auto"
                style={{ "--i": i + 2 } as React.CSSProperties}
              >
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Your resumes</h1>
          {originals.length > 0 && (
            <Button onClick={startTailor}>
              <AiIcon data-icon="inline-start" />
              Tailor to a job
            </Button>
          )}
        </div>

        {isGuest && resumes && resumes.length > 0 && (
          <Alert className="mb-6 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-col gap-0.5">
              <AlertTitle>Saved in this browser only</AlertTitle>
              <AlertDescription>Sign in to keep your resumes safe and open them on any device.</AlertDescription>
            </div>
            <Button
              size="sm"
              className="self-start sm:self-auto"
              onClick={() => openSignIn("Keep your resumes safe and open them anywhere.")}
            >
              Sign in
            </Button>
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
        ) : originals.length === 0 ? (
          <Empty className="rounded-xl border border-dashed bg-card py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>Your next opportunity starts with one resume.</EmptyTitle>
              <EmptyDescription>Pick a template above, start blank, or import the resume you already have.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <ImportButton />
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {originals.map((r, i) => (
              <ResumeCard key={r.id} index={i} resume={r} copies={copiesOf(r.id)} onChanged={load} />
            ))}
          </ul>
        )}
      </section>

      {tailored.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <h2 className="font-heading text-2xl font-medium tracking-tight">Tailored for jobs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each one is a copy made for a specific job. Your originals stay as they are.</p>
          <ul className="mt-5 flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {tailored.map((r) => (
              <TailoredRow key={r.id} resume={r} source={byId.get(r.sourceResumeId ?? "")} onChanged={load} />
            ))}
          </ul>
        </section>
      )}
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
      <span className="relative block overflow-hidden rounded-lg border border-border shadow-page transition-[border-color,transform] duration-200 ease-(--ease-out) [@media(hover:hover)]:group-hover:-translate-y-0.5 [@media(hover:hover)]:group-hover:border-primary group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
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

function ResumeCard({
  resume,
  copies,
  index,
  onChanged,
}: {
  resume: ResumeSummary;
  copies: number;
  index: number;
  onChanged: () => void;
}) {
  return (
    <li className="stagger-in group relative flex flex-col gap-2.5" style={{ "--i": index } as React.CSSProperties}>
      <div className="relative">
        <Link
          href={`/r/${resume.id}`}
          className="block overflow-hidden rounded-lg border border-border bg-white shadow-page transition-[border-color,transform] duration-200 ease-(--ease-out) outline-none [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Open ${resume.title}`}
        >
          <PagePreview templateId={resume.templateId} content={resume.content} mode="thumb" hints />
        </Link>
        {/* Quick action on hover or keyboard focus. Touch screens use the header button or the menu instead of covering the page. */}
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/r/${resume.id}/tailor`} />}
          aria-label={`Tailor ${resume.title} to a job`}
          className="absolute inset-x-3 bottom-3 opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden"
        >
          <AiIcon data-icon="inline-start" />
          Tailor to a job
        </Button>
      </div>

      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{resume.title}</p>
          <p className="text-xs text-muted-foreground">
            {TEMPLATES[resume.templateId].name} · Edited {timeAgo(resume.updatedAt)}
          </p>
          {copies > 0 && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {copies} tailored {copies === 1 ? "version" : "versions"}
            </p>
          )}
        </div>
        <ResumeMenu resume={resume} onChanged={onChanged} />
      </div>
    </li>
  );
}

function TailoredRow({
  resume,
  source,
  onChanged,
}: {
  resume: ResumeSummary;
  source?: ResumeSummary;
  onChanged: () => void;
}) {
  const { download, busyId } = useDownloadPdf();
  return (
    <li className="group relative flex items-center gap-4 px-4 py-3 transition-colors [@media(hover:hover)]:hover:bg-muted/40">
      <div className="w-10 shrink-0 overflow-hidden rounded-sm border bg-white">
        <PagePreview templateId={resume.templateId} content={resume.content} mode="thumb" hints />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/r/${resume.id}/tailor`}
          className="block truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          {resume.title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {source ? `From ${source.title} · ` : ""}Edited {timeAgo(resume.updatedAt)}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => download(resume)}
          disabled={busyId === resume.id}
        >
          {busyId === resume.id ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          PDF
        </Button>
        <ResumeMenu resume={resume} onChanged={onChanged} />
      </div>
    </li>
  );
}

/** The ⋯ menu shared by resume cards and tailored rows, with its dialogs. */
function ResumeMenu({ resume, onChanged }: { resume: ResumeSummary; onChanged: () => void }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(resume.title);
  const { download, busyId } = useDownloadPdf();
  const tailored = !!resume.sourceResumeId;

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="-mr-1.5" aria-label={`More actions for ${resume.title}`} />}
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(`/r/${resume.id}`)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/r/${resume.id}/tailor`)}>
              <AiIcon />
              {tailored ? "Review suggestions" : "Tailor to a job"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => download(resume)} disabled={busyId === resume.id}>
              <DownloadIcon />
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setTitle(resume.title);
                setRenaming(true);
              }}
            >
              <FileTextIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={duplicate}>
              <CopyIcon />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
              {tailored
                ? "This removes this tailored copy for good. Your original resume stays."
                : "This removes the resume for good. Tailored copies made from it stay."}
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
    </>
  );
}
