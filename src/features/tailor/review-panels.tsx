"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ResumeContent } from "@/features/resumes/schema";
import { cn } from "@/lib/utils";
import { CheckIcon, CircleCheckIcon, CircleDashedIcon, CircleIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { rewritableLines, type Requirement, type SkillsPlan } from "./types";
export function SkillsCard({
  plan,
  content,
  onChange,
  onAccept,
  onReject,
  onUndo,
}: {
  plan: SkillsPlan;
  onChange: (patch: Partial<SkillsPlan>) => void;
  content: ResumeContent;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
}) {
  if (plan.status !== "pending") {
    return (
      <div id="sugg-skills" className="page-in flex items-center gap-2.5 border-b px-5 py-3 text-sm sm:px-6">
        {plan.status === "accepted" ? (
          <CheckIcon className="size-4 text-success" />
        ) : (
          <XIcon className="size-4 text-muted-foreground" />
        )}
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
    <section id="sugg-skills" className="flex scroll-my-24 flex-col gap-3 border-b px-5 py-5 sm:px-6">
      <h3 className="text-sm font-medium">Skills</h3>
      <p className="text-xs text-muted-foreground">
        Current order: {content.skills.map((s) => s.name).join(", ")}
      </p>
      {ordered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={plan.useOrder !== false}
              onChange={(e) => onChange({ useOrder: e.target.checked })}
            />{" "}
            Use this skills order
          </label>
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
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={a.selected !== false}
                    onChange={(event) =>
                      onChange({
                        add: plan.add.map((item) =>
                          item === a ? { ...item, selected: event.target.checked } : item,
                        ),
                      })
                    }
                  />
                  <span>
                    {a.name}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Evidence:{" "}
                      {rewritableLines(content).find((line) => line.id === a.evidence)?.text ??
                        "Check your original resume"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={onAccept}>
          <CheckIcon data-icon="inline-start" />
          Apply selected changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          Keep original
        </Button>
      </div>
    </section>
  );
}

const MATCH_GROUPS: {
  status: Requirement["status"];
  label: string;
  Icon: typeof CircleIcon;
  tone: string;
}[] = [
  { status: "covered", label: "You show this", Icon: CircleCheckIcon, tone: "text-success" },
  { status: "partial", label: "Partly shown", Icon: CircleDashedIcon, tone: "text-primary" },
  { status: "missing", label: "Not on your resume", Icon: CircleIcon, tone: "text-muted-foreground" },
];

export function MatchPanel({
  requirements,
  onFocus,
  compact,
}: {
  requirements: Requirement[];
  onFocus: (lineIds: string[]) => void;
  compact?: boolean;
}) {
  if (!requirements.length) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        We couldn&apos;t pick out clear requirements from this posting.
      </p>
    );
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
                      {r.kind === "preferred" && (
                        <span className="text-muted-foreground"> · nice to have</span>
                      )}
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
            AI can misread evidence. Check every claim before applying it. Add missing experience yourself in
            the editor.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
