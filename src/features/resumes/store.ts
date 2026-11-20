"use client";

import type { TailorResult, TailorSession } from "@/features/tailor/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyContent,
  isTemplateId,
  parseContent,
  ResumeContentError,
  resumeContentSchema,
  SCHEMA_VERSION,
  validateContent,
  type Resume,
  type ResumeContent,
  type TemplateId,
} from "./schema";

export type ResumeSummary = Omit<
  Pick<Resume, "id" | "title" | "templateId" | "content" | "updatedAt" | "sourceResumeId" | "jobId">,
  "content"
> & { content?: ResumeContent | null };

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string; sessionRevision?: number }
  | { ok: false; reason: "conflict" | "error" | "invalid" };

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
  list(options?: { offset?: number; limit?: number }): Promise<ResumeSummary[]>;
  get(id: string): Promise<Resume | null>;
  create(input: CreateInput): Promise<Resume>;
  /** Saves the job, makes a copy of the source resume, and stores the suggestions for it. */
  createTailored(input: TailoredInput): Promise<{ resume: Resume; session: TailorSession }>;
  getTailorSession(resumeId: string): Promise<TailorSession | null>;

  /** Saves only if the stored revision still matches, so a newer save elsewhere is never overwritten. */
  saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult>;
  saveDocument(
    id: string,
    document: { content: ResumeContent; title: string; templateId: TemplateId },
    revision: number,
  ): Promise<SaveResult>;
  saveReview(
    id: string,
    session: TailorSession,
    content: ResumeContent,
    revision: number,
    sessionRevision: number,
  ): Promise<SaveResult>;
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
  schema_version: number;
};

function fromRow(row: Row): Resume {
  if (row.schema_version > SCHEMA_VERSION) throw new ResumeContentError(row.content);
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
  "id, title, template_id, content, revision, source_resume_id, job_id, created_at, updated_at, schema_version";

class SupabaseResumeStore implements ResumeStore {
  constructor(private db: SupabaseClient) {}

  private async userId() {
    const { data, error: authError } = await this.db.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") throw authError;
    if (data.user) return data.user.id;
    // Guests get an anonymous account the first time they make something.
    const { data: anon, error } = await this.db.auth.signInAnonymously();
    if (error || !anon.user) throw error ?? new Error("No session");
    return anon.user.id;
  }

  async list({ offset = 0, limit = 20 } = {}) {
    const { data, error } = await this.db
      .from("resumes")
      .select("id,title,template_id,updated_at,source_resume_id,job_id")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + Math.min(50, Math.max(1, limit)) - 1);
    if (error) throw error;
    return (data as Row[]).map((row) => ({
      id: row.id,
      title: row.title,
      templateId: isTemplateId(row.template_id) ? row.template_id : ("classic" as TemplateId),
      updatedAt: row.updated_at,
      sourceResumeId: row.source_resume_id,
      jobId: row.job_id,
    }));
  }

  async get(id: string) {
    const { data, error } = await this.db.from("resumes").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
  }

  async create(input: CreateInput) {
    const content = validateContent(input.content ?? emptyContent());
    const user_id = await this.userId();
    const { data, error } = await this.db
      .from("resumes")
      .insert({
        user_id,
        title: input.title ?? "Untitled resume",
        template_id: input.templateId,
        content,
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
    validateContent(source.content);
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
      .select(
        "id, resume_id, job_id, revision, suggestions, match, created_at, jobs(description), resumes(source_resume_id)",
      )
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const s = (data.suggestions ?? {}) as {
      suggestions?: TailorSession["suggestions"];
      skills?: TailorSession["skills"];
    };
    const m = (data.match ?? {}) as {
      requirements?: TailorSession["requirements"];
      job?: TailorSession["job"];
      sample?: boolean;
    };
    // Embedded rows come back as an object or a one-item array depending on the relation.
    const one = <T>(v: unknown) => (Array.isArray(v) ? v[0] : v) as T | null;
    return {
      id: data.id,
      revision: data.revision,
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

  async saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult> {
    const parsed = resumeContentSchema.safeParse(content);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    const { data, error } = await this.db
      .from("resumes")
      .update({ content: parsed.data })
      .eq("id", id)
      .eq("revision", revision)
      .select("revision, updated_at");
    if (error) return { ok: false, reason: "error" };
    if (!data?.length) return { ok: false, reason: "conflict" };
    return { ok: true, revision: data[0].revision, updatedAt: data[0].updated_at };
  }

  async saveDocument(
    id: string,
    document: { content: ResumeContent; title: string; templateId: TemplateId },
    revision: number,
  ): Promise<SaveResult> {
    const content = resumeContentSchema.safeParse(document.content);
    if (
      !content.success ||
      !document.title.trim() ||
      document.title.length > 200 ||
      !isTemplateId(document.templateId)
    )
      return { ok: false, reason: "invalid" };
    const { data, error } = await this.db
      .from("resumes")
      .update({ content: content.data, title: document.title, template_id: document.templateId })
      .eq("id", id)
      .eq("revision", revision)
      .select("revision,updated_at");
    if (error) return { ok: false, reason: "error" };
    if (!data?.length) return { ok: false, reason: "conflict" };
    return { ok: true, revision: data[0].revision, updatedAt: data[0].updated_at };
  }

  async saveReview(
    id: string,
    session: TailorSession,
    content: ResumeContent,
    revision: number,
    sessionRevision: number,
  ): Promise<SaveResult> {
    const parsed = resumeContentSchema.safeParse(content);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    const { data, error } = await this.db.rpc("save_resume_review", {
      p_resume_id: id,
      p_session_id: session.id,
      p_revision: revision,
      p_session_revision: sessionRevision,
      p_content: parsed.data,
      p_choices: { suggestions: session.suggestions, skills: session.skills },
    });
    if (error) return { ok: false, reason: "error" };
    return data as SaveResult;
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
const LOCAL_WORKSPACE_KEY = "rello.dev.workspace";

class LocalResumeStore implements ResumeStore {
  private read(): Resume[] {
    const workspace = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    let source: string | null = workspace;
    let raw: unknown;
    try {
      source = workspace ? JSON.stringify(JSON.parse(workspace).resumes) : localStorage.getItem(LOCAL_KEY);
      raw = JSON.parse(source ?? "[]");
    } catch {
      throw new ResumeContentError(source);
    }
    if (
      !Array.isArray(raw) ||
      !raw.every(
        (r) =>
          r &&
          typeof r === "object" &&
          typeof r.id === "string" &&
          typeof r.title === "string" &&
          typeof r.updatedAt === "string",
      )
    )
      throw new ResumeContentError(raw);
    // Keep raw documents intact when another record is created, renamed or deleted.
    return raw as Resume[];
  }

  private write(all: Resume[]) {
    const workspace = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (workspace)
      localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ ...JSON.parse(workspace), resumes: all }));
    else localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  }

  async list({ offset = 0, limit = 20 } = {}) {
    return this.read()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))
      .slice(offset, offset + Math.min(50, Math.max(1, limit)))
      .map(({ id, title, templateId, updatedAt, sourceResumeId, jobId }) => ({
        id,
        title,
        templateId,
        updatedAt,
        sourceResumeId,
        jobId,
      }));
  }

  async get(id: string) {
    const resume = this.read().find((r) => r.id === id);
    return resume ? { ...resume, content: parseContent(resume.content) } : null;
  }

  async create(input: CreateInput) {
    const content = validateContent(input.content ?? emptyContent());
    const now = new Date().toISOString();
    const resume: Resume = {
      id: crypto.randomUUID(),
      title: input.title ?? "Untitled resume",
      templateId: input.templateId,
      content,
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
    const workspace = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    const sessions = workspace
      ? JSON.parse(workspace).sessions
      : JSON.parse(localStorage.getItem(LOCAL_TAILOR_KEY) ?? "[]");
    if (!Array.isArray(sessions)) throw new ResumeContentError(sessions);
    return sessions as TailorSession[];
  }

  private writeSessions(sessions: TailorSession[]) {
    const workspace = localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (workspace)
      localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ ...JSON.parse(workspace), sessions }));
    else localStorage.setItem(LOCAL_TAILOR_KEY, JSON.stringify(sessions));
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
    this.writeSessions([...this.sessions(), session]);
    return { resume, session };
  }

  async getTailorSession(resumeId: string) {
    return this.sessions().find((s) => s.resumeId === resumeId) ?? null;
  }

  async saveContent(id: string, content: ResumeContent, revision: number): Promise<SaveResult> {
    const parsed = resumeContentSchema.safeParse(content);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    const all = this.read();
    const r = all.find((x) => x.id === id);
    if (!r) return { ok: false, reason: "error" };
    if (r.revision !== revision) return { ok: false, reason: "conflict" };
    r.content = parsed.data;
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
    r.revision += 1;
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

  async saveDocument(
    id: string,
    document: { content: ResumeContent; title: string; templateId: TemplateId },
    revision: number,
  ): Promise<SaveResult> {
    if (
      !resumeContentSchema.safeParse(document.content).success ||
      !document.title.trim() ||
      document.title.length > 200 ||
      !isTemplateId(document.templateId)
    )
      return { ok: false, reason: "invalid" };
    const all = this.read();
    const row = all.find((row) => row.id === id);
    if (!row || row.revision !== revision) return { ok: false, reason: "conflict" };
    Object.assign(row, document, { revision: row.revision + 1, updatedAt: new Date().toISOString() });
    this.write(all);
    return { ok: true, revision: row.revision, updatedAt: row.updatedAt };
  }

  async saveReview(
    id: string,
    session: TailorSession,
    content: ResumeContent,
    revision: number,
    sessionRevision: number,
  ): Promise<SaveResult> {
    if (!resumeContentSchema.safeParse(content).success) return { ok: false, reason: "invalid" };
    const resumes = this.read(),
      sessions = this.sessions();
    const row = resumes.find((row) => row.id === id);
    const current = sessions.find((row) => row.id === session.id && row.resumeId === id);
    if (!row || !current || row.revision !== revision || (current.revision ?? 1) !== sessionRevision)
      return { ok: false, reason: "conflict" };
    row.content = content;
    row.revision++;
    row.updatedAt = new Date().toISOString();
    const next = { ...session, revision: sessionRevision + 1 };
    localStorage.setItem(
      LOCAL_WORKSPACE_KEY,
      JSON.stringify({
        resumes,
        sessions: sessions.map((value) => (value.id === session.id ? next : value)),
      }),
    );
    return { ok: true, revision: row.revision, sessionRevision: next.revision, updatedAt: row.updatedAt };
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
