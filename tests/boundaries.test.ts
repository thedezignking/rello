import { readBytes } from "@/lib/request-body";
import { currentBudget, withRequestBudget } from "@/lib/request-budget";
import { safeNext } from "@/lib/safe-redirect";
import { describe, expect, it, vi } from "vitest";
describe("request boundaries", () => {
  it("rejects cross-origin redirect spellings", () => {
    for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "/\tevil", " /resumes"])
      expect(safeNext(value)).toBe("/resumes");
    expect(safeNext("/r/123?tab=skills#preview")).toBe("/r/123?tab=skills#preview");
  });
  it("counts stream bytes even when content-length is absent", async () => {
    const request = new Request("http://localhost", { method: "POST", body: "123456" });
    await expect(readBytes(request, 5)).rejects.toMatchObject({ status: 413 });
  });
  it("shares a single cancellation signal with nested work", async () => {
    const controller = new AbortController();
    const finish = vi.fn();
    await withRequestBudget(
      new Request("http://localhost", { signal: controller.signal }),
      1000,
      async () => {
        currentBudget()!.finish.push(async (ok) => finish(ok));
        controller.abort();
        expect(currentBudget()!.signal.aborted).toBe(true);
        return new Response("cancelled", { status: 499 });
      },
    );
    expect(finish).toHaveBeenCalledWith(false);
  });
});
