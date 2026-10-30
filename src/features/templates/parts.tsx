import { cn } from "@/lib/utils";
import type { Bullet, ResumeContent, SectionKey } from "@/features/resumes/schema";

// A4 at 96 dpi. Templates are laid out at this size and scaled to fit.
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
/** 14mm — the top/bottom margin on every PDF page (see /print). */
export const PRINT_MARGIN = 53;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(value: string) {
  if (!value) return "";
  const [y, m] = value.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`.trim();
}

export function formatRange(start: string, end: string, current = false) {
  const a = formatMonth(start);
  const b = current ? "Present" : formatMonth(end);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** "https://www.linkedin.com/in/ada/" → "linkedin.com/in/ada" */
export function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export function href(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export type ContactItem = { key: string; label: string; href?: string };

export function contactItems(p: ResumeContent["personal"]): ContactItem[] {
  const items: ContactItem[] = [];
  if (p.email) items.push({ key: "email", label: p.email, href: `mailto:${p.email}` });
  if (p.phone) items.push({ key: "phone", label: p.phone });
  if (p.location) items.push({ key: "location", label: p.location });
  if (p.linkedin) items.push({ key: "linkedin", label: prettyUrl(p.linkedin), href: href(p.linkedin) });
  if (p.website) items.push({ key: "website", label: prettyUrl(p.website), href: href(p.website) });
  return items;
}

export function filled(bullets: Bullet[]) {
  return bullets.filter((b) => b.text.trim());
}

/** Which sections have anything to show, in reading order. */
export function visibleSections(c: ResumeContent) {
  return {
    summary: !!c.summary.trim(),
    experience: c.experience.some((e) => e.title || e.company || filled(e.bullets).length),
    education: c.education.some((e) => e.school || e.degree),
    skills: c.skills.length > 0,
    projects: c.projects.some((p) => p.name || p.description),
    certifications: c.certifications.some((x) => x.name),
  };
}

export function Bullets({ items, className }: { items: Bullet[]; className?: string }) {
  const list = filled(items);
  if (!list.length) return null;
  return (
    <ul className={cn("list-disc pl-[1.15em] marker:text-current", className)}>
      {list.map((b) => (
        <li key={b.id} data-line={b.id} className="break-inside-avoid pl-[0.2em]">
          {b.text}
        </li>
      ))}
    </ul>
  );
}

export function Link({ href, plain, children }: { href?: string; plain?: boolean; children: React.ReactNode }) {
  if (!href || plain) return <>{children}</>;
  return (
    <a href={href} className="text-inherit no-underline">
      {children}
    </a>
  );
}

export type TemplateProps = {
  content: ResumeContent;
  /** Show faint hints for an empty name/headline, for the editor only. */
  hints?: boolean;
  /** Render links as text — for thumbnails that sit inside a link already. */
  plain?: boolean;
};

export function sectionAttrs(key: SectionKey) {
  return { "data-section": key };
}
