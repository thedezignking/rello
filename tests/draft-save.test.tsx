// @vitest-environment jsdom
import { useDraftSave } from "@/features/resumes/use-draft-save";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const valid = (s: string) => s.length < 20;
const readable = (value: unknown) => {
  if (typeof value !== "string") throw Error("bad draft");
  return value;
};
const result = (revision: number) => ({ ok: true as const, revision, updatedAt: "2026-11-20" });
beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("durable document drafts", () => {
  it("serializes in-flight edits and keeps the newest revision", async () => {
    let release!: (value: ReturnType<typeof result>) => void;
    const persist = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(result(3));
    const { result: hook } = renderHook(() =>
      useDraftSave({ initial: "a", version: { revision: 1 }, storageKey: "draft", valid, readable, persist }),
    );
    act(() => hook.current.setValue("b"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    act(() => hook.current.setValue("c"));
    expect(JSON.parse(sessionStorage.getItem("draft")!).value).toBe("c");
    await act(async () => {
      release(result(2));
      await Promise.resolve();
    });
    expect(persist).toHaveBeenNthCalledWith(2, "c", { revision: 2 });
    expect(hook.current.status).toBe("saved");
    expect(sessionStorage.getItem("draft")).toBeNull();
  });
  it("restores an interrupted draft without overwriting a changed stored version", async () => {
    sessionStorage.setItem("draft", JSON.stringify({ value: "my edit", version: { revision: 1 } }));
    const persist = vi.fn();
    const { result: hook } = renderHook(() =>
      useDraftSave({
        initial: "their edit",
        version: { revision: 2 },
        storageKey: "draft",
        valid,
        readable,
        persist,
      }),
    );
    expect(hook.current.value).toBe("my edit");
    expect(hook.current.status).toBe("conflict");
    await act(async () => {
      expect(await hook.current.flush()).toBe(false);
    });
    expect(persist).not.toHaveBeenCalled();
  });
  it("keeps failed saves recoverable and supports undo after deletion", async () => {
    const persist = vi.fn().mockResolvedValue({ ok: false, reason: "error" });
    const { result: hook } = renderHook(() =>
      useDraftSave({
        initial: "entry",
        version: { revision: 1 },
        storageKey: "draft",
        valid,
        readable,
        persist,
      }),
    );
    act(() => hook.current.setValue(""));
    await act(async () => {
      await hook.current.flush();
    });
    expect(hook.current.status).toBe("error");
    expect(sessionStorage.getItem("draft")).toContain('"value":""');
    act(() => hook.current.undo());
    expect(hook.current.value).toBe("entry");
  });
  it("preserves malformed recovery data and blocks writes", async () => {
    sessionStorage.setItem("draft", "{broken");
    const persist = vi.fn();
    const { result: hook } = renderHook(() =>
      useDraftSave({ initial: "a", version: { revision: 1 }, storageKey: "draft", valid, readable, persist }),
    );
    act(() => hook.current.setValue("b"));
    await act(async () => {
      await hook.current.flush();
    });
    expect(hook.current.rawRecovery).toBe("{broken");
    expect(sessionStorage.getItem("draft")).toBe("{broken");
    expect(persist).not.toHaveBeenCalled();
  });
});
