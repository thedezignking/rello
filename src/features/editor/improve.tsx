"use client";

import { createContext, use, useState } from "react";
import { CheckIcon, MessageCircleQuestionIcon, RotateCcwIcon } from "lucide-react";
import { AiIcon } from "@/components/ai-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { ResumeContent } from "@/features/resumes/schema";
import { diffWords } from "@/features/tailor/diff";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { id: "improve", label: "Improve writing" },
  { id: "professional", label: "More professional" },
  { id: "concise", label: "More concise" },
  { id: "impactful", label: "More impactful" },
  { id: "grammar", label: "Fix grammar" },
] as const;
type Action = (typeof ACTIONS)[number]["id"];

const ImproveContext = createContext<{ resumeId: string; content: ResumeContent } | null>(null);
export const ImproveProvider = ImproveContext.Provider;

type State =
  | { status: "idle" }
  | { status: "loading"; action: Action }
  | { status: "ready"; action: Action; from: string; text: string; question: string; sample?: boolean }
  | { status: "error"; action: Action; message: string };

/**
 * "Improve with AI" for one field: a menu trigger to place next to the field,
 * and a panel to place under it. The suggestion never replaces the text on
 * its own — only Accept does.
 */
export function useImprove({
  text,
  where,
  onAccept,
  compact,
}: {
  text: string;
  where: string;
  onAccept: (next: string) => void;
  compact?: boolean;
}) {
  const ctx = use(ImproveContext);
  const [state, setState] = useState<State>({ status: "idle" });
  const tooShort = text.trim().length < 3;

  async function run(action: Action) {
    if (!ctx || tooShort) return;
    const from = text;
    setState({ status: "loading", action });
    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: ctx.resumeId,
        text: from,
        action,
        where,
        ...(isSupabaseConfigured() ? {} : { content: ctx.content }),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setState({
        status: "error",
        action,
        message: data?.error?.message ?? "We couldn't get a suggestion. Check your connection and try again.",
      });
      return;
    }
    setState({ status: "ready", action, from, text: data.text, question: data.question ?? "", sample: data.sample });
  }

  // Outside a saved resume (e.g. reviewing an import) there's nothing to ask about yet.
  if (!ctx) return { trigger: null, panel: null };

  const busy = state.status === "loading";

  const trigger = (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={tooShort || busy}
        render={
          compact ? (
            <Button variant="ghost" size="icon-sm" aria-label="Improve with AI" />
          ) : (
            <Button variant="ghost" size="xs" className="text-primary hover:text-primary" />
          )
        }
      >
        {busy ? <Spinner /> : <AiIcon data-icon={compact ? undefined : "inline-start"} />}
        {!compact && "Improve"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          {ACTIONS.map((a) => (
            <DropdownMenuItem key={a.id} onClick={() => run(a.id)}>
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  let panel: React.ReactNode = null;
  if (state.status === "loading") {
    panel = (
      <Panel>
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-3.5" />
          Rewriting…
        </p>
      </Panel>
    );
  } else if (state.status === "error") {
    panel = (
      <Panel>
        <p className="text-destructive">{state.message}</p>
        <div className="flex gap-1.5">
          <Button size="xs" variant="outline" onClick={() => run(state.action)}>
            Try again
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setState({ status: "idle" })}>
            Dismiss
          </Button>
        </div>
      </Panel>
    );
  } else if (state.status === "ready") {
    const stale = state.from !== text;
    panel = (
      <Panel>
        <p className="text-xs text-muted-foreground">
          {ACTIONS.find((a) => a.id === state.action)?.label}
          {state.sample && " · sample"}
        </p>
        <p className="leading-relaxed">
          {diffWords(state.from, state.text).map((p, i) =>
            p.added ? (
              <mark key={i} className="rounded-[2px] bg-highlight-soft px-0.5 text-inherit">
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
        {state.question && (
          <p className="flex gap-1.5 text-xs text-muted-foreground">
            <MessageCircleQuestionIcon className="mt-px size-3.5 shrink-0 text-primary" />
            {state.question}
          </p>
        )}
        {stale && <p className="text-xs text-muted-foreground">You&apos;ve edited the text since. Ask again to use your latest version.</p>}
        <div className="flex gap-1.5">
          <Button
            size="xs"
            disabled={stale}
            onClick={() => {
              onAccept(state.text);
              setState({ status: "idle" });
            }}
          >
            <CheckIcon data-icon="inline-start" />
            Accept
          </Button>
          <Button size="xs" variant="ghost" onClick={() => run(state.action)}>
            <RotateCcwIcon data-icon="inline-start" />
            {stale ? "Ask again" : "Another"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setState({ status: "idle" })}>
            Dismiss
          </Button>
        </div>
      </Panel>
    );
  }

  return { trigger, panel };
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-primary/20 bg-accent/40 p-3 text-sm", className)}>
      {children}
    </div>
  );
}
