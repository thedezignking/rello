"use client";

import {
  isTemplateId,
  parseContent,
  resumeContentSchema,
  type Resume,
  type ResumeContent,
  type TemplateId,
} from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { useDraftSave, type DocumentVersion } from "@/features/resumes/use-draft-save";
import { useCallback } from "react";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict" | "invalid";
type Document = { content: ResumeContent; title: string; templateId: TemplateId };
function readable(value: unknown): Document {
  const raw = value as Document;
  if (!raw || typeof raw.title !== "string" || !isTemplateId(raw.templateId)) throw Error("Invalid draft");
  return { ...raw, content: parseContent(raw.content) };
}
const valid = (value: Document) =>
  resumeContentSchema.safeParse(value.content).success && !!value.title.trim() && value.title.length <= 200;

export function useAutosave(resume: Resume) {
  const persist = useCallback(
    (value: Document, version: DocumentVersion) =>
      getResumeStore().saveDocument(resume.id, value, version.revision),
    [resume.id],
  );
  const draft = useDraftSave({
    initial: { content: resume.content, title: resume.title, templateId: resume.templateId },
    version: { revision: resume.revision },
    storageKey: `rello.draft.${resume.id}`,
    readable,
    valid,
    persist,
  });
  const setContent = (update: ResumeContent | ((previous: ResumeContent) => ResumeContent)) =>
    draft.setValue((current) => ({
      ...current,
      content: typeof update === "function" ? update(current.content) : update,
    }));
  return {
    ...draft,
    content: draft.value.content,
    title: draft.value.title,
    templateId: draft.value.templateId,
    setContent,
    setTitle: (title: string) => draft.setValue((current) => ({ ...current, title })),
    setTemplateId: (templateId: TemplateId) => draft.setValue((current) => ({ ...current, templateId })),
  };
}
