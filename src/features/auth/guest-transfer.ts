"use client";

export const GUEST_BACKUP = "rello.guest-backup";
export async function prepareGuestTransfer() {
  const response = await fetch("/api/account/guest-transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "prepare" }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Couldn't preserve your guest work. Try again.");
  sessionStorage.setItem(GUEST_BACKUP, JSON.stringify(body.backup));
}

let finishing: Promise<void> | null = null;
export function finishGuestTransfer(): Promise<void> {
  if (finishing) return finishing;
  if (!sessionStorage.getItem(GUEST_BACKUP)) return Promise.resolve();
  finishing = (async () => {
    const backup = JSON.parse(sessionStorage.getItem(GUEST_BACKUP)!);
    const response = await fetch("/api/account/guest-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "claim", guestId: backup.guestId }),
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        body.error?.message ?? "Couldn't finish guest recovery. Your recovery copy has been kept.",
      );
    sessionStorage.removeItem(GUEST_BACKUP);
  })().finally(() => {
    finishing = null;
  });
  return finishing;
}
