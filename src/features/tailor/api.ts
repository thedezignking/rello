"use client";

import type { ResumeContent } from "@/features/resumes/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { TailorResult } from "./types";

export class TailorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(url: string, body: object, content: ResumeContent, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.any([
      AbortSignal.timeout(url.endsWith("/line") ? 55000 : 85000),
      ...(signal ? [signal] : []),
    ]),
    // The local development store only lives in this browser, so send the
    // resume along; with Supabase the server reads it itself.
    body: JSON.stringify(isSupabaseConfigured() ? body : { ...body, content }),
  }).catch(() => null);
  if (!res)
    throw new TailorError(
      "network",
      signal?.aborted
        ? "Request cancelled. Your input is kept. Retry to recover any result that already finished; a credit hold may take a moment to clear."
        : "The request timed out or lost its connection. Retry to recover a completed result.",
    );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new TailorError(
      data?.error?.code ?? "unknown",
      data?.error?.message ?? "We couldn't get suggestions this time. Try again. Nothing was changed.",
    );
  }
  return data as T;
}

export function requestTailor(
  input: { requestId: string; resumeId: string; description: string; title?: string; company?: string },
  content: ResumeContent,
  signal?: AbortSignal,
) {
  return post<TailorResult & { resumeId?: string; creditCharged?: boolean }>(
    "/api/tailor",
    input,
    content,
    signal,
  );
}

// Retain the request ID after a lost response so a retry can recover the same result.
const pendingLines = new Map<string, string>();

export async function requestLine(
  input: { resumeId: string; description: string; targetId: string; previous: string; nudge: string },
  content: ResumeContent,
) {
  const key = JSON.stringify({ input, content });
  const requestId = pendingLines.get(key) ?? crypto.randomUUID();
  pendingLines.set(key, requestId);
  try {
    const result = await post<{ text: string; reason: string }>(
      "/api/tailor/line",
      { ...input, requestId },
      content,
    );
    pendingLines.delete(key);
    return result;
  } catch (error) {
    if (
      !(error instanceof TailorError) ||
      !["network", "in_progress", "billing_unavailable"].includes(error.code)
    )
      pendingLines.delete(key);
    throw error;
  }
}
