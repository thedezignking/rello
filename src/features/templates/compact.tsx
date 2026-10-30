import { H1, H2 } from "./doc-headings";
import {
  Bullets,
  contactItems,
  formatMonth,
  formatRange,
  Link,
  sectionAttrs,
  visibleSections,
  type TemplateProps,
} from "./parts";

// Compact: dense grotesk, split header, tight rhythm — fits long histories
// on fewer pages.
export function CompactTemplate({ content: c, hints, plain }: TemplateProps) {
  const show = visibleSections(c);
  const contacts = contactItems(c.personal);

  return (
    <div className="px-[44px] py-[38px] print:py-0 font-[family-name:var(--font-doc-plex)] text-[9.25pt] leading-[1.38] text-[#161616]">
      <header {...sectionAttrs("personal")} className="flex items-end justify-between gap-6 border-b-2 border-[#161616] pb-[8px]">
        <div className="min-w-0">
          <H1 className="text-[19pt] leading-tight font-bold tracking-[-0.01em]">
            {c.personal.name || (hints && <span className="text-[#c8c8c8]">Your name</span>)}
          </H1>
          {(c.personal.headline || hints) && (
            <p className="text-[10pt] text-[#3d3d3d]">
              {c.personal.headline || (hints && <span className="text-[#c8c8c8]">Your headline</span>)}
            </p>
          )}
        </div>
        {contacts.length > 0 && (
          <ul className="shrink-0 text-right text-[8.5pt] leading-[1.45] text-[#3d3d3d]">
            {contacts.map((item) => (
              <li key={item.key}>
                <Link plain={plain} href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {show.summary && (
        <Section title="Summary" k="summary">
          <p data-line="summary">{c.summary}</p>
        </Section>
      )}

      {show.experience && (
        <Section title="Experience" k="experience">
          <div className="flex flex-col gap-[7px]">
            {c.experience.map((e) => (
              <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-4">
                  <p>
                    <span className="font-bold">{e.title}</span>
                    {e.company && <span>, {e.company}</span>}
                    {e.location && <span className="text-[#5a5a5a]"> — {e.location}</span>}
                  </p>
                  <p className="shrink-0 text-[8.5pt] text-[#5a5a5a] tabular-nums">
                    {formatRange(e.start, e.end, e.current)}
                  </p>
                </div>
                <Bullets items={e.bullets} className="mt-[2px]" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.projects && (
        <Section title="Projects" k="projects">
          <div className="flex flex-col gap-[6px]">
            {c.projects.map((p) => (
              <div key={p.id} data-entry={p.id} className="break-inside-avoid-page">
                <p>
                  <span className="font-bold">{p.name}</span>
                  {p.url && (
                    <span className="text-[8.5pt] text-[#5a5a5a]">
                      {" "}— <Link plain={plain} href={p.url}>{p.url.replace(/^https?:\/\//, "")}</Link>
                    </span>
                  )}
                  {p.description && <span>: {p.description}</span>}
                </p>
                <Bullets items={p.bullets} className="mt-[2px]" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.education && (
        <Section title="Education" k="education">
          <div className="flex flex-col gap-[5px]">
            {c.education.map((e) => (
              <div key={e.id} data-entry={e.id} className="flex items-baseline justify-between gap-4">
                <p>
                  <span className="font-bold">{e.school}</span>
                  {(e.degree || e.field) && <span>, {[e.degree, e.field].filter(Boolean).join(", ")}</span>}
                  {e.details && <span className="text-[#5a5a5a]"> — {e.details}</span>}
                </p>
                <p className="shrink-0 text-[8.5pt] text-[#5a5a5a] tabular-nums">{formatRange(e.start, e.end)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(show.skills || show.certifications) && (
        <Section title="Skills & certifications" k={show.skills ? "skills" : "certifications"}>
          {show.skills && (
            <p data-section="skills">
              <span className="font-bold">Skills: </span>
              {c.skills.map((s) => s.name).join(", ")}
            </p>
          )}
          {show.certifications && (
            <p data-section="certifications" className="mt-[2px]">
              <span className="font-bold">Certifications: </span>
              {c.certifications
                .filter((x) => x.name)
                .map((x) => [x.name, x.issuer, formatMonth(x.date)].filter(Boolean).join(", "))
                .join("; ")}
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  k,
  children,
}: {
  title: string;
  k: Parameters<typeof sectionAttrs>[0];
  children: React.ReactNode;
}) {
  return (
    <section {...sectionAttrs(k)} className="mt-[11px]">
      <H2 className="break-after-avoid mb-[4px] text-[9.5pt] font-bold tracking-[0.06em] uppercase">{title}</H2>
      {children}
    </section>
  );
}
