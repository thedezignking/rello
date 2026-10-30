import type { ResumeContent } from "@/features/resumes/schema";

/** An imported resume waiting to be checked. Lives in sessionStorage until saved or discarded. */
export type PendingImport = {
  content: ResumeContent;
  fileName: string;
  sample?: boolean;
  truncated?: boolean;
};

export const IMPORT_KEY = "rello.import";
