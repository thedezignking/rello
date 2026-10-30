"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleIcon,
  DownloadIcon,
  PencilIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { SaveIndicator } from "@/features/editor/editor";
import { useAutosave } from "@/features/editor/use-autosave";
import { useDownloadPdf } from "@/features/pdf/use-download-pdf";
import { newId, type Resume, type ResumeContent } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { PagePreview } from "@/features/templates/page-preview";
import { cn } from "@/lib/utils";
import { requestLine, TailorError } from "./api";
import { diffWords } from "./diff";
import {
  applyLine,
  rewritableLines,
  type LineSection,
  type Requirement,
  type SkillsPlan,
  type Suggestion,
  type TailorSession,
} from "./types";

const SECTION_LABEL: Record<LineSection, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
};

export function Review({ resume, initial }: { resume: Resume; initial: TailorSession }) {
  const { content, setContent, status, retry, flush } = useAutosave(resume);
  const { download, busyId } = useDownloadPdf();
  const [session, setSession] = useState(initial);
  const [active, setActive] = useState<string[]>([]);
  const [view, setView] = useState<"suggestions" | "page">("suggestions");
  const [retrying, setRetrying] = useState<string | null>(null);

  // Persist accept / reject state shortly after each change.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      getResumeStore()
        .saveTailorSession(session)
        .catch(() => toast.add({ title: "Couldn't save your choices", description: "They'll be kept while this page is open.", type: "error" }));
    }, 400);
    return () => clearTimeout(t);
  }, [session]);

  const contexts = new Map(rewritableLines(content).map((l) => [l.id, l.context]));
  const pending = session.suggestions.filter((s) => s.status === "pending");
  const total = session.suggestions.length + (session.skills ? 1 : 0);
  const reviewed = total - pending.length - (session.skills?.status === "pending" ? 1 : 0);

  function setSuggestion(id: string, patch: Partial<Suggestion>) {
    setSession((s) => ({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }

  function accept(s: Suggestion) {
    setContent((c) => applyLine(c, s.targetId, s.suggested));
    setSuggestion(s.id, { status: "accepted" });
  }
  function reject(s: Suggestion) {
    setSuggestion(s.id, { status: "rejected" });
  }
  function undo(s: Suggestion) {
    if (s.status === "accepted") setContent((c) => applyLine(c, s.targetId, s.original));
    setSuggestion(s.id, { status: "pending" });
  }
  function bulk(section: LineSection, to: "accepted" | "rejected") {
    const targets = session.suggestions.filter((s) => s.section === section && s.status === "pending");
    if (to === "accepted") setContent((c) => targets.reduce((acc, s) => applyLine(acc, s.targetId, s.suggested), c));
    setSession((ss) => ({
      ...ss,
      suggestions: ss.suggestions.map((x) => (targets.some((t) => t.id === x.id) ? { ...x, status: to } : x)),
    }));
  }

  async function tryAgain(s: Suggestion, nudge: string) {
    setRetrying(s.id);
    try {
      const next = await requestLine(
        { resumeId: resume.id, description: session.description, targetId: s.targetId, previous: s.suggested, nudge },
        content,
      );
      setSuggestion(s.id, { suggested: next.text, reason: next.reason, status: "pending" });
    } catch (err) {
      toast.add({
        title: "No new suggestion",
        description: err instanceof TailorError ? err.message : "Try again in a moment.",
        type: "error",
      });
    } finally {
      setRetrying(null);
    }
  }

  function setSkills(patch: Partial<SkillsPlan>) {
    setSession((s) => (s.skills ? { ...s, skills: { ...s.skills, ...patch } } : s));
  }
  function acceptSkills(plan: SkillsPlan) {
    const before = content.skills;
    setContent((c) => {
      const byId = new Map(c.skills.map((x) => [x.id, x]));
      const ordered = plan.order ? plan.order.map((id) => byId.get(id)).filter((x) => !!x) : c.skills;
      const rest = c.skills.filter((x) => !ordered.includes(x));
      return { ...c, skills: [...ordered, ...rest, ...plan.add.map((a) => ({ id: newId("sk"), name: a.name }))] };
    });
    setSkills({ status: "accepted", before });
  }
  function undoSkills(plan: SkillsPlan) {
    if (plan.status === "accepted" && plan.before) {
      const before = plan.before;
      setContent((c) => ({ ...c, skills: before }));
    }
    setSkills({ status: "pending", before: undefined });
  }

  function focusSuggestionFor(lineId: string) {
    const s = session.suggestions.find((x) => x.targetId === lineId);
    if (!s) return;
    setView("suggestions");
    setActive([lineId]);
    requestAnimationFrame(() =>
      document.getElementById(`sugg-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  const groups = (["summary", "experience", "projects"] as const)
    .map((section) => ({ section, items: session.suggestions.filter((s) => s.section === section) }))
    .filter((g) => g.items.length);
  const allDone = total > 0 && reviewed === total;
  const jobLabel = [session.job.title, session.job.company].filter(Boolean).join(" · ");

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-2 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/resumes" />} aria-label="Back to your resumes">
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg leading-tight font-medium tracking-tight">{resume.title}</p>
          <p className="truncate text-xs text-muted-foreground">Tailored copy · your original is unchanged</p>
        </div>
        <SaveIndicator status={status} onRetry={retry} />
        <Button variant="outline" nativeButton={false} render={<Link href={`/r/${resume.id}`} />} className="hidden sm:inline-flex">
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
        <Button
          onClick={() => download({ id: resume.id, title: resume.title, templateId: resume.templateId, content }, flush)}
          disabled={busyId === resume.id}
          aria-label="Download PDF"
        >
          {busyId === resume.id ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
      </header>

      {session.sample && (
        <div className="border-b bg-highlight-soft px-4 py-1.5 text-center text-xs">
          These are sample suggestions for testing. Add <code className="font-mono">OPENROUTER_API_KEY</code> to get real ones.
        </div>
      )}

      <div className="border-b bg-card px-4 py-2 lg:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as "suggestions" | "page")}>
          <TabsList className="w-full">
            <TabsTrigger value="suggestions">Suggestions{pending.length ? ` (${pending.length})` : ""}</TabsTrigger>
            <TabsTrigger value="page">Page</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-r bg-card xl:block">
          <MatchPanel requirements={session.requirements} onFocus={setActive} />
        </aside>

        <div className={cn("min-w-0 flex-1 overflow-y-auto", view === "suggestions" && "hidden lg:block")}>
          <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-8 sm:py-10">
            <PagePreview
              templateId={resume.templateId}
              content={content}
              highlight={{ ids: pending.map((s) => s.targetId), active }}
              onLineClick={focusSuggestionFor}
              className="rounded-sm shadow-page"
            />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Highlighted lines have a suggestion. Click one to see it.
            </p>
          </div>
        </div>

        <aside
          className={cn(
            "w-full shrink-0 overflow-y-auto border-l bg-card lg:block lg:w-[420px]",
            view === "page" && "hidden",
          )}
        >
          <div className="flex flex-col gap-1 border-b px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tailoring for</p>
            <p className="font-medium">{jobLabel || "This job"}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {total ? `${reviewed} of ${total} reviewed` : "No changes suggested"}
            </p>
          </div>

          <details className="group border-b xl:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium">
              Job match
              <span className="text-xs font-normal text-muted-foreground">
                {session.requirements.filter((r) => r.status === "covered").length} of {session.requirements.length} covered
              </span>
            </summary>
            <MatchPanel requirements={session.requirements} onFocus={setActive} compact />
          </details>

          {allDone && (
            <div className="m-4 flex flex-col gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="flex items-center gap-2 font-medium">
                <CircleCheckIcon className="size-4 text-success" />
                All reviewed. Your tailored copy is saved.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => download({ id: resume.id, title: resume.title, templateId: resume.templateId, content }, flush)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/r/${resume.id}`} />}>
                  Keep editing
                </Button>
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Your resume already reads well for this job. Check the job match for anything missing.
            </p>
          )}

          <div className="flex flex-col gap-6 px-4 py-5">
            {groups.map(({ section, items }) => {
              const open = items.filter((s) => s.status === "pending").length;
              return (
                <section key={section} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-sm font-medium">
                      {SECTION_LABEL[section]} <span className="text-muted-foreground tabular-nums">· {items.length}</span>
                    </h2>
                    {open > 1 && (
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => bulk(section, "rejected")}>
                          Reject all
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => bulk(section, "accepted")}>
                          Accept all
                        </Button>
                      </div>
                    )}
                  </div>
                  {items.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      s={s}
                      context={contexts.get(s.targetId) ?? ""}
                      busy={retrying === s.id}
                      onHover={(on) => setActive(on ? [s.targetId] : [])}
                      onAccept={() => accept(s)}
                      onReject={() => reject(s)}
                      onUndo={() => undo(s)}
                      onRetry={(nudge) => tryAgain(s, nudge)}
                    />
                  ))}
                </section>
              );
            })}

            {session.skills && (
              <SkillsCard
                plan={session.skills}
                content={content}
                onAccept={() => acceptSkills(session.skills!)}
                onReject={() => setSkills({ status: "rejected" })}
                onUndo={() => undoSkills(session.skills!)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SuggestionCard({
  s,
  context,
  busy,
  onHover,
  onAccept,
  onReject,
  onUndo,
  onRetry,
}: {
  s: Suggestion;
  context: string;
  busy: boolean;
  onHover: (on: boolean) => void;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
  onRetry: (nudge: string) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [nudge, setNudge] = useState("");

  if (s.status !== "pending") {
    return (
      <div id={`sugg-${s.id}`} className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
        {s.status === "accepted" ? (
          <CheckIcon className="size-4 shrink-0 text-success" />
        ) : (
          <XIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {s.status === "accepted" ? "Accepted" : "Kept original"} · {s.status === "accepted" ? s.suggested : s.original}
        </span>
        <Button size="xs" variant="ghost" onClick={onUndo}>
          <RotateCcwIcon data-icon="inline-start" />
          Undo
        </Button>
      </div>
    );
  }

  const parts = diffWords(s.original, s.suggested);

  return (
    <article
      id={`sugg-${s.id}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocusCapture={() => onHover(true)}
      onBlurCapture={() => onHover(false)}
      className="flex scroll-my-4 flex-col gap-3 rounded-lg border bg-background/40 p-4 transition-colors hover:border-ring/40"
    >
      {context && <p className="truncate text-xs text-muted-foreground">{context}</p>}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Now</p>
        <p className="text-sm text-muted-foreground">{s.original}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Suggested</p>
        <p className={cn("text-sm leading-relaxed", busy && "opacity-50")}>
          {parts.map((p, i) =>
            p.added ? (
              <mark key={i} className="rounded-[2px] bg-highlight-soft px-0.5 text-inherit">
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
      </div>
      {s.reason && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <SparklesIcon className="mt-px size-3.5 shrink-0 text-primary" />
          {s.reason}
        </p>
      )}

      {asking && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRetry(nudge);
            setAsking(false);
            setNudge("");
          }}
        >
          <Input
            autoFocus
            value={nudge}
            maxLength={200}
            onChange={(e) => setNudge(e.target.value)}
            placeholder="Optional: shorter, mention Figma…"
            aria-label="What to change in the next suggestion"
            className="h-8"
          />
          <Button type="submit" size="sm">
            Suggest again
          </Button>
        </form>
      )}

      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={onAccept} disabled={busy}>
          <CheckIcon data-icon="inline-start" />
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAsking((a) => !a)} disabled={busy} className="ml-auto">
          {busy ? <Spinner data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
          Try again
        </Button>
      </div>
    </article>
  );
}

function SkillsCard({
  plan,
  content,
  onAccept,
  onReject,
  onUndo,
}: {
  plan: SkillsPlan;
  content: ResumeContent;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
}) {
  if (plan.status !== "pending") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
        {plan.status === "accepted" ? <CheckIcon className="size-4 text-success" /> : <XIcon className="size-4 text-muted-foreground" />}
        <span className="flex-1 text-muted-foreground">
          Skills · {plan.status === "accepted" ? "Accepted" : "Kept as they were"}
        </span>
        <Button size="xs" variant="ghost" onClick={onUndo}>
          <RotateCcwIcon data-icon="inline-start" />
          Undo
        </Button>
      </div>
    );
  }

  const byId = new Map(content.skills.map((s) => [s.id, s.name]));
  const ordered = plan.order ? plan.order.map((id) => byId.get(id)).filter(Boolean) : [];

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-background/40 p-4">
      <h2 className="text-sm font-medium">Skills</h2>
      {ordered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Put the most relevant first:</p>
          <ol className="flex flex-wrap gap-1.5">
            {ordered.map((name, i) => (
              <li key={name} className="rounded-md border bg-card px-2 py-0.5 text-sm">
                <span className="mr-1 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                {name}
              </li>
            ))}
          </ol>
        </div>
      )}
      {plan.add.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Already shown in your experience, but not listed:</p>
          <ul className="flex flex-wrap gap-1.5">
            {plan.add.map((a) => (
              <li key={a.name}>
                <Badge variant="secondary" className="bg-highlight-soft text-foreground">
                  + {a.name}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={onAccept}>
          <CheckIcon data-icon="inline-start" />
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          Reject
        </Button>
      </div>
    </section>
  );
}

const MATCH_GROUPS: { status: Requirement["status"]; label: string; Icon: typeof CircleIcon; tone: string }[] = [
  { status: "covered", label: "You show this", Icon: CircleCheckIcon, tone: "text-success" },
  { status: "partial", label: "Partly shown", Icon: CircleDashedIcon, tone: "text-primary" },
  { status: "missing", label: "Not on your resume", Icon: CircleIcon, tone: "text-muted-foreground" },
];

function MatchPanel({
  requirements,
  onFocus,
  compact,
}: {
  requirements: Requirement[];
  onFocus: (lineIds: string[]) => void;
  compact?: boolean;
}) {
  if (!requirements.length) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">We couldn&apos;t pick out clear requirements from this posting.</p>;
  }
  return (
    <div className={cn("flex flex-col gap-5", compact ? "px-5 pb-4" : "px-5 py-5")}>
      {!compact && <h2 className="text-sm font-medium">Job match</h2>}
      {MATCH_GROUPS.map(({ status, label, Icon, tone }) => {
        const items = requirements.filter((r) => r.status === status);
        if (!items.length) return null;
        return (
          <div key={status} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {label} <span className="tabular-nums">· {items.length}</span>
            </p>
            <ul className="flex flex-col gap-1">
              {items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={!r.evidence.length}
                    onMouseEnter={() => onFocus(r.evidence)}
                    onMouseLeave={() => onFocus([])}
                    onFocus={() => onFocus(r.evidence)}
                    onBlur={() => onFocus([])}
                    className="flex w-full gap-2 rounded-md px-1.5 py-1 text-left text-sm enabled:hover:bg-muted disabled:cursor-default"
                  >
                    <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
                    <span>
                      {r.text}
                      {r.kind === "preferred" && <span className="text-muted-foreground"> · nice to have</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {requirements.some((r) => r.status === "missing") && (
        <Alert className="text-xs">
          <AlertDescription>
            We never add what isn&apos;t on your resume. If you do have this experience, add it in the editor yourself.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
