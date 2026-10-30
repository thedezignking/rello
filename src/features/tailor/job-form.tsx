"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { isReadyForTailoring, type Resume } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requestTailor, TailorError } from "./api";

const MIN_CHARS = 80;
const MAX_CHARS = 15000;

function copyTitle(job: { title: string; company: string }) {
  if (job.title && job.company) return `${job.title} — ${job.company}`;
  if (job.title || job.company) return job.title || job.company;
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Tailored resume — ${date}`;
}

export function JobForm({ source }: { source: Resume }) {
  const router = useRouter();
  const { requireAccount } = useAuth();
  const ids = { description: useId(), title: useId(), company: useId() };
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = isReadyForTailoring(source.content);
  const length = description.trim().length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!length) return setError("Paste the job description to continue.");
    if (length < MIN_CHARS) return setError("That looks too short. Paste the full job description.");
    if (length > MAX_CHARS) return setError("That's very long. Paste just the role, responsibilities and requirements.");
    if (isSupabaseConfigured() && !(await requireAccount("Sign in to tailor your resume to a job."))) return;

    setBusy(true);
    setError(null);
    try {
      const result = await requestTailor(
        {
          resumeId: source.id,
          description: description.trim(),
          title: title.trim() || undefined,
          company: company.trim() || undefined,
        },
        source.content,
      );
      const { resume } = await getResumeStore().createTailored({
        source,
        title: copyTitle(result.job),
        description: description.trim(),
        result,
      });
      router.replace(`/r/${resume.id}/tailor`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof TailorError ? err.message : "We couldn't save your tailored copy. Try again — nothing was changed.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-2 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/r/${source.id}`} />}
          aria-label="Back to the resume"
        >
          <ArrowLeftIcon />
        </Button>
        <p className="truncate text-sm text-muted-foreground">
          Tailoring <span className="font-medium text-foreground">{source.title}</span>
        </p>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">Tailor to a job</h1>
        <p className="mt-2 text-muted-foreground">
          Paste the job you&apos;re applying for. You&apos;ll get line-by-line suggestions to accept, reject or
          ask for again. Your original resume stays as it is; changes go into a new copy.
        </p>

        {!ready && (
          <Alert className="mt-6">
            <TriangleAlertIcon />
            <AlertTitle>Add a little more first</AlertTitle>
            <AlertDescription>
              Add your name and some experience, education or projects before tailoring.
            </AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/r/${source.id}`} />}>
                Edit resume
              </Button>
            </AlertAction>
          </Alert>
        )}

        {busy ? (
          <div role="status" className="mt-8 flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
            <Spinner className="size-6 text-primary" />
            <p className="font-medium">Reading the job and matching your experience…</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              This usually takes 10–30 seconds. If it doesn&apos;t work, nothing changes.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8">
            <FieldGroup>
              <Field data-invalid={!!error || undefined}>
                <FieldLabel htmlFor={ids.description}>Job description</FieldLabel>
                <Textarea
                  id={ids.description}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste the whole posting — responsibilities, requirements, nice-to-haves."
                  aria-invalid={!!error || undefined}
                  className="min-h-64 bg-card"
                  disabled={!ready}
                />
                {error ? (
                  <FieldError>{error}</FieldError>
                ) : (
                  <FieldDescription className="tabular-nums">
                    {length ? `${length.toLocaleString()} characters` : "Copy it straight from the job board."}
                  </FieldDescription>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={ids.title}>Job title (optional)</FieldLabel>
                  <Input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!ready} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={ids.company}>Company (optional)</FieldLabel>
                  <Input id={ids.company} value={company} onChange={(e) => setCompany(e.target.value)} disabled={!ready} />
                </Field>
              </div>
              <FieldDescription className="-mt-3">Leave these blank and we&apos;ll pick them up from the posting.</FieldDescription>
              <Button type="submit" size="lg" className="h-11 self-start px-5" disabled={!ready}>
                Get suggestions
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </FieldGroup>
          </form>
        )}
      </main>
    </div>
  );
}
