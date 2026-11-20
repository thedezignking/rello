"use client";

import { parseContent, resumeContentSchema, type Resume } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { useDraftSave, type DocumentVersion } from "@/features/resumes/use-draft-save";
import { useCallback } from "react";
import { z } from "zod";
import type { TailorSession } from "./types";

const status = z.enum(["pending", "accepted", "rejected"]);
const choices = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      targetId: z.string(),
      section: z.enum(["summary", "experience", "projects"]),
      original: z.string(),
      suggested: z.string(),
      reason: z.string(),
      status,
    }),
  ),
  skills: z
    .object({
      order: z.array(z.string()).nullable(),
      add: z.array(z.object({ name: z.string(), evidence: z.string(), selected: z.boolean().optional() })),
      status,
      useOrder: z.boolean().optional(),
      before: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    })
    .nullable(),
});
type ReviewDocument = { content: Resume["content"]; session: TailorSession };
const valid = (value: ReviewDocument) =>
  resumeContentSchema.safeParse(value.content).success && choices.safeParse(value.session).success;

export function useReviewSave(resume: Resume, initial: TailorSession) {
  const readable = useCallback(
    (value: unknown): ReviewDocument => {
      const raw = value as ReviewDocument;
      if (!raw || raw.session?.id !== initial.id) throw Error("Invalid review draft");
      return { content: parseContent(raw.content), session: { ...initial, ...choices.parse(raw.session) } };
    },
    [initial],
  );
  const persist = useCallback(
    (value: ReviewDocument, version: DocumentVersion) =>
      getResumeStore().saveReview(
        resume.id,
        value.session,
        value.content,
        version.revision,
        version.sessionRevision ?? 1,
      ),
    [resume.id],
  );
  const draft = useDraftSave({
    initial: { content: resume.content, session: initial },
    version: { revision: resume.revision, sessionRevision: initial.revision ?? 1 },
    storageKey: `rello.review-draft.${initial.id}`,
    readable,
    valid,
    persist,
  });
  return { ...draft, content: draft.value.content, session: draft.value.session };
}
