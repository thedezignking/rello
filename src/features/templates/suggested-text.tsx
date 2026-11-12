"use client";

import { createContext, useContext } from "react";
import { diffInline } from "@/features/tailor/diff";
import type { ResumeContent } from "@/features/resumes/schema";
import type { SkillsPlan } from "@/features/tailor/types";

export const SuggestedTextContext = createContext<Record<string, { original: string; suggested: string }>>({});
export const SuggestedSkillsContext = createContext<SkillsPlan | null>(null);

export function SuggestedSkills({ skills, separator = ", " }: { skills: ResumeContent["skills"]; separator?: string }) {
  const plan = useContext(SuggestedSkillsContext);
  if (!plan || plan.status !== "pending") return <>{skills.map((s) => s.name).join(separator)}</>;
  const byId = new Map(skills.map((s) => [s.id, s.name]));
  const ids = [...new Set([...(plan.order ?? []), ...skills.map((s) => s.id)])].filter((id) => byId.has(id));
  return <span data-line="skills" role="button" tabIndex={0} aria-label="Review proposed skills changes">
    {plan.order && <><span className="text-[9pt] font-sans text-[#555]">Current: </span><del className="bg-red-50 text-red-800">{skills.map((s) => s.name).join(separator)}</del><br /><span className="text-[9pt] font-sans text-[#555]">Proposed order: </span></>}
    <ins className="bg-green-100 text-green-900 no-underline">{ids.map((id) => byId.get(id)).join(separator)}{plan.add.length > 0 && `${ids.length ? separator : ""}${plan.add.map((s) => s.name).join(separator)}`}</ins>
  </span>;
}

export function SuggestedText({ id, children }: { id: string; children: string }) {
  const change = useContext(SuggestedTextContext)[id];
  if (!change) return <>{children}</>;
  return <span data-line={id} role="button" tabIndex={0} aria-label={`Review suggested change: ${change.suggested}`}>{diffInline(change.original, change.suggested).map((part, index) =>
    part.kind === "removed" ? <span key={index}><del className="bg-red-50 text-red-800 decoration-red-500">{part.text}</del>{! /\s$/.test(part.text) ? " " : ""}</span> :
    part.kind === "added" ? <ins key={index} className="bg-green-100 text-green-900 no-underline">{part.text}</ins> :
    <span key={index}>{part.text}</span>
  )}</span>;
}
