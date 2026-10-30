"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TailorResult, TailorSession } from "@/features/tailor/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  emptyContent,
  isTemplateId,
  parseContent,
  SCHEMA_VERSION,
  type Resume,
  type ResumeContent,
  type TemplateId,
} from "./schema";

export type ResumeSummary = Pick<
  Resume,
  "id" | "title" | "templateId" | "content" | "updatedAt" | "sourceResumeId" | "jobId"
>;

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; reason: "conflict" | "error" };

type CreateInput = {
  title?: string;
  templateId: TemplateId;
  content?: ResumeContent;
  sourceResumeId?: string;
  jobId?: string;
};

type TailoredInput = {
  source: Resume;
  title: string;
  description: string;
  result: TailorResult;
};

export interface ResumeStore {
  list(): Promise<ResumeSummary[]>;
  get(id: string): Promise<Resume | null>;
  create(input: CreateInput): Promise<Resume>;
  /** Saves the job, makes a copy of the source resume, and stores the suggestions for it. */
  createTailored(input: TailoredInput): Promise<{ resume: Resume; session: TailorSession }>;
  getTailorSession(resumeId: string): Promise<TailorSession | null>;
  /** Persists accept / reject / try-again state. */
  saveTailorSession(session: TailorSession): Promise<void>;
  /** Saves only if the stored revision still matches, so a newer save elsewhere is never overwritten. */
  saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult>;
  update(id: string, patch: { title?: string; templateId?: TemplateId }): Promise<void>;
  duplicate(id: string): Promise<Resume>;
  remove(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

type Row = {
  id: string;
  title: string;
  template_id: string;
  content: unknown;
  revision: number;
  source_resume_id: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: Row): Resume {
  return {
    id: row.id,
    title: row.title,
    templateId: isTemplateId(row.template_id) ? row.template_id : "classic",
    content: parseContent(row.content),
    revision: row.revision,
    sourceResumeId: row.source_resume_id,
    jobId: row.job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  "id, title, template_id, content, revision, source_resume_id, job_id, created_at, updated_at";

class SupabaseResumeStore implements ResumeStore {
  constructor(private db: SupabaseClient) {}

  private async userId() {
    const { data } = await this.db.auth.getUser();
    if (data.user) return data.user.id;
    // Guests get an anonymous account the first time they make something.
    const { data: anon, error } = await this.db.auth.signInAnonymously();
    if (error || !anon.user) throw error ?? new Error("No session");
    return anon.user.id;
  }

  async list() {
    const { data, error } = await this.db
      .from("resumes")
      .select(COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(fromRow);
  }

  async get(id: string) {
    const { data, error } = await this.db.from("resumes").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
  }

  async create(input: CreateInput) {
    const user_id = await this.userId();
    const { data, error } = await this.db
      .from("resumes")
      .insert({
        user_id,
        title: input.title ?? "Untitled resume",
        template_id: input.templateId,
        content: input.content ?? emptyContent(),
        schema_version: SCHEMA_VERSION,
        source_resume_id: input.sourceResumeId ?? null,
        job_id: input.jobId ?? null,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return fromRow(data as Row);
  }

  async createTailored({ source, title, description, result }: TailoredInput) {
    const user_id = await this.userId();
    const { data: job, error: jobError } = await this.db
      .from("jobs")
      .insert({ user_id, title: result.job.title, company: result.job.company, description })
      .select("id")
      .single();
    if (jobError) throw jobError;

    const resume = await this.create({
      title,
      templateId: source.templateId,
      content: source.content,
      sourceResumeId: source.id,
      jobId: job.id,
    });

    const { data: row, error } = await this.db
      .from("tailor_sessions")
      .insert({
        user_id,
        resume_id: resume.id,
        job_id: job.id,
        status: "ready",
        suggestions: { suggestions: result.suggestions, skills: result.skills },
        match: { requirements: result.requirements, job: result.job, sample: !!result.sample },
      })
      .select("id, created_at")
      .single();
    if (error) throw error;

    return {
      resume,
      session: {
        ...result,
        id: row.id,
        resumeId: resume.id,
        sourceResumeId: source.id,
        jobId: job.id,
        description,
        createdAt: row.created_at,
      },
    };
  }

  async getTailorSession(resumeId: string): Promise<TailorSession | null> {
    const { data, error } = await this.db
      .from("tailor_sessions")
      .select("id, resume_id, job_id, suggestions, match, created_at, jobs(description), resumes(source_resume_id)")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const s = (data.suggestions ?? {}) as { suggestions?: TailorSession["suggestions"]; skills?: TailorSession["skills"] };
    const m = (data.match ?? {}) as { requirements?: TailorSession["requirements"]; job?: TailorSession["job"]; sample?: boolean };
    // Embedded rows come back as an object or a one-item array depending on the relation.
    const one = <T,>(v: unknown) => (Array.isArray(v) ? v[0] : v) as T | null;
    return {
      id: data.id,
      resumeId: data.resume_id,
      jobId: data.job_id,
      sourceResumeId: one<{ source_resume_id: string }>(data.resumes)?.source_resume_id ?? "",
      description: one<{ description: string }>(data.jobs)?.description ?? "",
      createdAt: data.created_at,
      job: m.job ?? { title: "", company: "" },
      requirements: m.requirements ?? [],
      suggestions: s.suggestions ?? [],
      skills: s.skills ?? null,
      sample: m.sample,
    };
  }

  async saveTailorSession(session: TailorSession) {
    const { error } = await this.db
      .from("tailor_sessions")
      .update({ suggestions: { suggestions: session.suggestions, skills: session.skills } })
      .eq("id", session.id);
    if (error) throw error;
  }

  async saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult> {
    const { data, error } = await this.db
      .from("resumes")
      .update({ content })
      .eq("id", id)
      .eq("revision", revision)
      .select("revision, updated_at");
    if (error) return { ok: false, reason: "error" };
    if (!data?.length) return { ok: false, reason: "conflict" };
    return { ok: true, revision: data[0].revision, updatedAt: data[0].updated_at };
  }

  async update(id: string, patch: { title?: string; templateId?: TemplateId }) {
    const { error } = await this.db
      .from("resumes")
      .update({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.templateId !== undefined && { template_id: patch.templateId }),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    if (!source) throw new Error("Resume not found");
    return this.create({
      title: `${source.title} (copy)`,
      templateId: source.templateId,
      content: source.content,
    });
  }

  async remove(id: string) {
    const { error } = await this.db.from("resumes").delete().eq("id", id);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Local fallback — development only, used while Supabase isn't configured.
// ---------------------------------------------------------------------------

const LOCAL_KEY = "rello.dev.resumes";
const LOCAL_TAILOR_KEY = "rello.dev.tailor";

class LocalResumeStore implements ResumeStore {
  private read(): Resume[] {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Resume[];
      return raw.map((r) => ({ ...r, content: parseContent(r.content) }));
    } catch {
      return [];
    }
  }

  private write(all: Resume[]) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  }

  async list() {
    return this.read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return this.read().find((r) => r.id === id) ?? null;
  }

  async create(input: CreateInput) {
    const now = new Date().toISOString();
    const resume: Resume = {
      id: crypto.randomUUID(),
      title: input.title ?? "Untitled resume",
      templateId: input.templateId,
      content: input.content ?? emptyContent(),
      revision: 1,
      sourceResumeId: input.sourceResumeId ?? null,
      jobId: input.jobId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.write([...this.read(), resume]);
    return resume;
  }

  private sessions(): TailorSession[] {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_TAILOR_KEY) ?? "[]") as TailorSession[];
    } catch {
      return [];
    }
  }

  async createTailored({ source, title, description, result }: TailoredInput) {
    const jobId = crypto.randomUUID();
    const resume = await this.create({
      title,
      templateId: source.templateId,
      content: source.content,
      sourceResumeId: source.id,
      jobId,
    });
    const session: TailorSession = {
      ...result,
      id: crypto.randomUUID(),
      resumeId: resume.id,
      sourceResumeId: source.id,
      jobId,
      description,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_TAILOR_KEY, JSON.stringify([...this.sessions(), session]));
    return { resume, session };
  }

  async getTailorSession(resumeId: string) {
    return this.sessions().find((s) => s.resumeId === resumeId) ?? null;
  }

  async saveTailorSession(session: TailorSession) {
    localStorage.setItem(
      LOCAL_TAILOR_KEY,
      JSON.stringify(this.sessions().map((s) => (s.id === session.id ? session : s))),
    );
  }

  async saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult> {
    const all = this.read();
    const r = all.find((x) => x.id === id);
    if (!r) return { ok: false, reason: "error" };
    if (r.revision !== revision) return { ok: false, reason: "conflict" };
    r.content = content;
    r.revision += 1;
    r.updatedAt = new Date().toISOString();
    this.write(all);
    return { ok: true, revision: r.revision, updatedAt: r.updatedAt };
  }

  async update(id: string, patch: { title?: string; templateId?: TemplateId }) {
    const all = this.read();
    const r = all.find((x) => x.id === id);
    if (!r) return;
    if (patch.title !== undefined) r.title = patch.title;
    if (patch.templateId !== undefined) r.templateId = patch.templateId;
    r.updatedAt = new Date().toISOString();
    this.write(all);
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    if (!source) throw new Error("Resume not found");
    return this.create({
      title: `${source.title} (copy)`,
      templateId: source.templateId,
      content: source.content,
    });
  }

  async remove(id: string) {
    this.write(this.read().filter((r) => r.id !== id));
  }
}

// ---------------------------------------------------------------------------

let store: ResumeStore | null = null;

export function getResumeStore(): ResumeStore {
  if (store) return store;
  if (isSupabaseConfigured()) {
    store = new SupabaseResumeStore(createClient());
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[rello] Supabase isn't configured — resumes are saved in this browser only.");
    store = new LocalResumeStore();
  } else {
    throw new Error("Supabase isn't configured.");
  }
  return store;
}
