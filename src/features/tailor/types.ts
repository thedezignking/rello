import type { ResumeContent } from "@/features/resumes/schema";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

/** A job requirement and how well the resume backs it up. */
export type Requirement = {
  id: string;
  text: string;
  kind: "required" | "preferred";
  status: "covered" | "partial" | "missing";
  /** Line ids in the resume that support it. */
  evidence: string[];
};

/** A proposed rewrite of one line. Nothing changes until it's accepted. */
export type Suggestion = {
  id: string;
  targetId: string;
  section: LineSection;
  original: string;
  suggested: string;
  reason: string;
  status: SuggestionStatus;
};

export type SkillsPlan = {
  /** Proposed order of existing skill ids, or null when the order is fine. */
  order: string[] | null;
  /** Skills the resume already shows evidence of but doesn't list. */
  add: { name: string; evidence: string }[];
  status: SuggestionStatus;
  /** The skills as they were before accepting, so Undo can restore them. */
  before?: ResumeContent["skills"];
};

export type TailorResult = {
  job: { title: string; company: string };
  requirements: Requirement[];
  suggestions: Suggestion[];
  skills: SkillsPlan | null;
  /** True when these came from the development stand-in, not a real model. */
  sample?: boolean;
};

export type TailorSession = TailorResult & {
  id: string;
  /** The tailored copy these suggestions apply to. */
  resumeId: string;
  sourceResumeId: string;
  jobId: string;
  description: string;
  createdAt: string;
};

export type LineSection = "summary" | "experience" | "projects";

export type Line = { id: string; section: LineSection; text: string; context: string };

/** Every line tailoring may rewrite, in page order, with stable ids. */
export function rewritableLines(c: ResumeContent): Line[] {
  const lines: Line[] = [];
  if (c.summary.trim()) lines.push({ id: "summary", section: "summary", text: c.summary, context: "Professional summary" });
  for (const e of c.experience) {
    const context = [e.title, e.company].filter(Boolean).join(" at ");
    for (const b of e.bullets) if (b.text.trim()) lines.push({ id: b.id, section: "experience", text: b.text, context });
  }
  for (const p of c.projects) {
    for (const b of p.bullets) if (b.text.trim()) lines.push({ id: b.id, section: "projects", text: b.text, context: `Project: ${p.name}` });
  }
  return lines;
}

/** Applies one accepted line to resume content. */
export function applyLine(c: ResumeContent, targetId: string, text: string): ResumeContent {
  if (targetId === "summary") return { ...c, summary: text };
  const mapBullets = <T extends { bullets: { id: string; text: string }[] }>(items: T[]) =>
    items.map((it) =>
      it.bullets.some((b) => b.id === targetId)
        ? { ...it, bullets: it.bullets.map((b) => (b.id === targetId ? { ...b, text } : b)) }
        : it,
    );
  return { ...c, experience: mapBullets(c.experience), projects: mapBullets(c.projects) };
}

/** The current text of a line, or null if it no longer exists. */
export function lineText(c: ResumeContent, targetId: string): string | null {
  if (targetId === "summary") return c.summary;
  for (const it of [...c.experience, ...c.projects]) {
    const b = it.bullets.find((x) => x.id === targetId);
    if (b) return b.text;
  }
  return null;
}
