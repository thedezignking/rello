import type { ResumeContent, TemplateId } from "@/features/resumes/schema";
import { ClassicTemplate } from "./classic";
import { PlainHeadingsProvider } from "./doc-headings";
import { CompactTemplate } from "./compact";
import { MinimalTemplate } from "./minimal";
import { ModernTemplate } from "./modern";
import type { TemplateProps } from "./parts";

export const TEMPLATES: Record<
  TemplateId,
  { name: string; blurb: string; Component: (props: TemplateProps) => React.ReactNode }
> = {
  classic: {
    name: "Classic",
    blurb: "Serif, centered header. Safe for any industry.",
    Component: ClassicTemplate,
  },
  modern: {
    name: "Modern",
    blurb: "Clean sans with a touch of blue.",
    Component: ModernTemplate,
  },
  compact: {
    name: "Compact",
    blurb: "Dense and tidy. Fits more on a page.",
    Component: CompactTemplate,
  },
  minimal: {
    name: "Minimal",
    blurb: "Quiet, airy, lots of whitespace.",
    Component: MinimalTemplate,
  },
};

export function ResumeDocument({
  templateId,
  content,
  hints,
  plain,
}: {
  templateId: TemplateId;
  content: ResumeContent;
  hints?: boolean;
  plain?: boolean;
}) {
  const { Component } = TEMPLATES[templateId] ?? TEMPLATES.classic;
  return (
    <PlainHeadingsProvider plain={plain}>
      <Component content={content} hints={hints} plain={plain} />
    </PlainHeadingsProvider>
  );
}
