"use client";

import type { SaveStatus } from "@/features/editor/use-autosave";
import { useCallback, useEffect, useRef, useState } from "react";
import { reportError } from "@/lib/error-reporting";
import type { SaveResult } from "./store";

export type DocumentVersion = { revision: number; sessionRevision?: number };
type Draft<T> = { value: T; version: DocumentVersion };

function restore<T>(key: string, initial: T, version: DocumentVersion, readable: (value: unknown) => T) {
  let raw: string | null = null;
  try {
    raw = typeof window === "undefined" ? null : sessionStorage.getItem(key);
    if (raw) {
      const draft = JSON.parse(raw) as Draft<unknown>;
      const value = readable(draft.value);
      return {
        value,
        conflict: JSON.stringify(draft.version) !== JSON.stringify(version),
        recovered: true,
        rawRecovery: null,
      };
    }
  } catch {
    if (raw) return { value: initial, conflict: true, recovered: true, rawRecovery: raw };
  }
  return { value: initial, conflict: false, recovered: false, rawRecovery: null };
}

export function useDraftSave<T>({
  initial,
  version,
  storageKey,
  readable,
  valid,
  persist,
}: {
  initial: T;
  version: DocumentVersion;
  storageKey: string;
  readable: (value: unknown) => T;
  valid: (value: T) => boolean;
  persist: (value: T, version: DocumentVersion) => Promise<SaveResult>;
}) {
  const [first] = useState(() => restore(storageKey, initial, version, readable));
  const [value, setState] = useState(first.value);
  const [status, setStatus] = useState<SaveStatus>(
    first.conflict ? "conflict" : !valid(first.value) ? "invalid" : first.recovered ? "unsaved" : "saved",
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [recovered, setRecovered] = useState(first.recovered);
  const [canUndo, setCanUndo] = useState(false);
  const latest = useRef(first.value);
  const saved = useRef(initial);
  const currentVersion = useRef(version);
  const blocked = useRef(first.conflict);
  const discarded = useRef(false);
  const history = useRef<T[]>([]);
  const running = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkpoint = useCallback(
    (snapshot: T) => {
      if (first.rawRecovery) {
        setStorageFailed(true);
        return;
      }
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ value: snapshot, version: currentVersion.current }),
        );
        setStorageFailed(false);
      } catch {
        setStorageFailed(true);
      }
    },
    [first.rawRecovery, storageKey],
  );

  const setValue = useCallback(
    (update: T | ((previous: T) => T)) => {
      const next = typeof update === "function" ? (update as (value: T) => T)(latest.current) : update;
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return;
      history.current = [...history.current.slice(-19), latest.current];
      setCanUndo(true);
      latest.current = next;
      checkpoint(next);
      setState(next);
      setStatus(blocked.current ? "conflict" : valid(next) ? "unsaved" : "invalid");
    },
    [checkpoint, valid],
  );

  const save = useCallback(() => {
    if (running.current) return running.current;
    running.current = (async () => {
      while (latest.current !== saved.current) {
        if (blocked.current) {
          setStatus("conflict");
          return;
        }
        const snapshot = latest.current;
        if (!valid(snapshot)) {
          setStatus("invalid");
          return;
        }
        setStatus("saving");
        const result = await persist(snapshot, currentVersion.current).catch(() => ({
          ok: false as const,
          reason: "error" as const,
        }));
        if (!result.ok) {
          if (result.reason === "error") reportError(new Error("Document save failed"), "resume.save");
          blocked.current = result.reason === "conflict";
          setStatus(result.reason);
          return;
        }
        currentVersion.current = {
          revision: result.revision,
          ...(result.sessionRevision === undefined ? {} : { sessionRevision: result.sessionRevision }),
        };
        saved.current = snapshot;
        if (latest.current !== snapshot) checkpoint(latest.current);
      }
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* A matching saved draft is harmless on reload. */
      }
      setRecovered(false);
      setStatus("saved");
    })().finally(() => {
      running.current = null;
    });
    return running.current;
  }, [checkpoint, persist, storageKey, valid]);

  useEffect(() => {
    if (latest.current === saved.current) return;
    timer.current = setTimeout(() => void save(), 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!discarded.current && latest.current !== saved.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await save();
    return latest.current === saved.current;
  }, [save]);
  const retry = useCallback(() => {
    void save();
  }, [save]);
  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous === undefined) return;
    latest.current = previous;
    checkpoint(previous);
    setState(previous);
    setStatus(blocked.current ? "conflict" : "unsaved");
    setCanUndo(history.current.length > 0);
  }, [checkpoint]);
  const discardDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    discarded.current = true;
    location.reload();
  }, [storageKey]);

  return {
    value,
    setValue,
    status,
    retry,
    flush,
    undo,
    canUndo,
    recovered,
    storageFailed,
    discardDraft,
    rawRecovery: first.rawRecovery,
  };
}
