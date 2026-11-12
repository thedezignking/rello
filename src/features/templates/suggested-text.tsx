"use client";

import { createContext, useContext } from "react";
import { diffInline } from "@/features/tailor/diff";

export const SuggestedTextContext = createContext<Record<string, { original: string; suggested: string }>>({});

export function SuggestedText({ id, children }: { id: string; children: string }) {
  const change = useContext(SuggestedTextContext)[id];
  if (!change) return <>{children}</>;
  return <>{diffInline(change.original, change.suggested).map((part, index) =>
    part.kind === "removed" ? <del key={index} className="bg-red-50 text-red-800 decoration-red-500">{part.text}</del> :
    part.kind === "added" ? <ins key={index} className="bg-green-100 text-green-900 no-underline">{part.text}</ins> :
    <span key={index}>{part.text}</span>
  )}</>;
}
