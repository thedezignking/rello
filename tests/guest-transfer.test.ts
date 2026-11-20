// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { finishGuestTransfer, GUEST_BACKUP } from "@/features/auth/guest-transfer";
afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
it("retains the recovery copy after an expired proof", async () => {
  sessionStorage.setItem(
    GUEST_BACKUP,
    JSON.stringify({ guestId: "fictional", resumes: [{ content: "fictional resume" }] }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: { message: "Guest session expired" } }, { status: 409 })),
  );
  await expect(finishGuestTransfer()).rejects.toThrow("expired");
  expect(sessionStorage.getItem(GUEST_BACKUP)).toContain("fictional resume");
});
it("deduplicates recovery and clears backup only after verified success", async () => {
  sessionStorage.setItem(GUEST_BACKUP, JSON.stringify({ guestId: "fictional", resumes: [] }));
  const fetch = vi.fn(async () => Response.json({ transferred: 2 }));
  vi.stubGlobal("fetch", fetch);
  await Promise.all([finishGuestTransfer(), finishGuestTransfer()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem(GUEST_BACKUP)).toBeNull();
});
