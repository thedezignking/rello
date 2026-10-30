"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Resume, ResumeContent } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

const DEBOUNCE_MS = 800;

export function useAutosave(resume: Resume) {
  const [content, setContent] = useState<ResumeContent>(resume.content);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const revision = useRef(resume.revision);
  const latest = useRef(content);
  const saved = useRef(content);
  const running = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(() => {
    // One save loop at a time; callers share the one in progress.
    if (running.current) return running.current;
    running.current = (async () => {
      // Keep going until what's on the server matches what's on screen —
      // edits made during a save get picked up by the next pass.
      while (latest.current !== saved.current) {
        const snapshot = latest.current;
        setStatus("saving");
        const result = await getResumeStore()
          .saveContent(resume.id, snapshot, revision.current)
          .catch(() => ({ ok: false as const, reason: "error" as const }));
        if (!result.ok) {
          setStatus(result.reason);
          return;
        }
        revision.current = result.revision;
        saved.current = snapshot;
      }
      setStatus("saved");
    })().finally(() => {
      running.current = null;
    });
    return running.current;
  }, [resume.id]);

  /** Saves now instead of waiting for the debounce. True when everything is saved. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await save();
    return latest.current === saved.current;
  }, [save]);

  useEffect(() => {
    latest.current = content;
    if (content === saved.current) return;
    setStatus((s) => (s === "conflict" ? s : "unsaved"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, save]);

  // Warn before leaving with changes that haven't reached the server.
  useEffect(() => {
    if (status === "saved") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  const retry = useCallback(() => {
    if (status === "error") void save();
  }, [save, status]);

  return { content, setContent, status, retry, flush };
}
