import { z } from "zod";

// Resume content is stored as JSON in `resumes.content`.
// Every entry and bullet carries a stable id so tailoring suggestions can
// point at the exact line they want to change.

export const SCHEMA_VERSION = 1;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_SKILL_LENGTH = 80;

function contentSchemas(bounded: boolean) {
  const id = z.string().min(1);
  const text = (bounded ? z.string().max(MAX_TEXT_LENGTH) : z.string()).default("");
  // "YYYY-MM" from <input type="month">, or empty.
  const month = z
    .string()
    .regex(/^(\d{4}-\d{2})?$/, "Use a month and year")
    .default("");

  const bulletSchema = z.object({ id, text }).strict();

  const experienceSchema = z
    .object({
      id,
      title: text,
      company: text,
      location: text,
      start: month,
      end: month,
      current: z.boolean().default(false),
      bullets: z.array(bulletSchema).default([]),
    })
    .strict();

  const educationSchema = z
    .object({
      id,
      school: text,
      degree: text,
      field: text,
      start: month,
      end: month,
      details: text,
    })
    .strict();

  const projectSchema = z
    .object({
      id,
      name: text,
      url: text,
      description: text,
      bullets: z.array(bulletSchema).default([]),
    })
    .strict();

  const certificationSchema = z
    .object({
      id,
      name: text,
      issuer: text,
      date: month,
      url: text,
    })
    .strict();

  const skillSchema = z
    .object({ id, name: bounded ? z.string().max(MAX_SKILL_LENGTH) : z.string() })
    .strict();

  const resumeContentSchema = z
    .object({
      personal: z
        .object({
          name: text,
          headline: text,
          email: text,
          phone: text,
          location: text,
          linkedin: text,
          website: text,
        })
        .strict()
        .default({
          name: "",
          headline: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          website: "",
        }),
      summary: text,
      experience: z.array(experienceSchema).default([]),
      education: z.array(educationSchema).default([]),
      skills: z.array(skillSchema).default([]),
      projects: z.array(projectSchema).default([]),
      certifications: z.array(certificationSchema).default([]),
    })
    .strict();
  return {
    bulletSchema,
    experienceSchema,
    educationSchema,
    projectSchema,
    certificationSchema,
    skillSchema,
    resumeContentSchema,
  };
}

export const {
  bulletSchema,
  experienceSchema,
  educationSchema,
  projectSchema,
  certificationSchema,
  skillSchema,
  resumeContentSchema,
} = contentSchemas(true);
// Older saves may exceed today's write limits. Reading must never truncate them.
const storedContentSchema = contentSchemas(false).resumeContentSchema;

export class ResumeContentError extends Error {
  constructor(public readonly rawContent: unknown) {
    super("This resume contains data we couldn't read. Download a recovery copy before making changes.");
    this.name = "ResumeContentError";
  }
}

export function validateContent(raw: unknown): ResumeContent {
  const result = resumeContentSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      "Some resume fields are invalid or too long. Check the highlighted fields before saving.",
    );
  }
  return result.data;
}

export type Bullet = z.infer<typeof bulletSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type ResumeContent = z.infer<typeof resumeContentSchema>;

export type SectionKey =
  "personal" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";

export const TEMPLATE_IDS = ["classic", "modern", "compact", "minimal"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type Resume = {
  id: string;
  title: string;
  templateId: TemplateId;
  content: ResumeContent;
  revision: number;
  sourceResumeId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function emptyContent(): ResumeContent {
  return resumeContentSchema.parse({});
}

/** Parses stored JSON, filling defaults so old or partial rows still load. */
export function parseContent(raw: unknown): ResumeContent {
  const result = storedContentSchema.safeParse(raw === undefined ? {} : raw);
  if (!result.success) throw new ResumeContentError(raw);
  return result.data;
}

export function isTemplateId(value: unknown): value is TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId);
}

/** PRD §7.3: name plus at least one real entry and some substance. */
export function isReadyForTailoring(c: ResumeContent) {
  const hasEntry =
    c.experience.some((e) => e.title || e.company) ||
    c.education.some((e) => e.school || e.degree) ||
    c.projects.some((p) => p.name);
  const hasSubstance =
    c.summary.trim().length > 0 ||
    c.skills.length > 0 ||
    c.experience.some((e) => e.bullets.some((b) => b.text.trim())) ||
    c.projects.some((p) => p.description.trim() || p.bullets.some((b) => b.text.trim()));
  return c.personal.name.trim().length > 0 && hasEntry && hasSubstance;
}
