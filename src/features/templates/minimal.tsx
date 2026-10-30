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

// Minimal: generous whitespace, light name, section labels in a quiet left
// gutter. Labels come first in the DOM, so text extraction still reads
// top to bottom.
export function MinimalTemplate({ content: c, hints, plain }: TemplateProps) {
  const show = visibleSections(c);
  const contacts = contactItems(c.personal);

  return (
    <div className="px-[64px] py-[60px] print:py-0 font-[family-name:var(--font-doc-sans)] text-[9.75pt] leading-[1.55] text-[#222]">
      <header {...sectionAttrs("personal")}>
        <H1 className="text-[26pt] leading-[1.05] font-light tracking-[-0.025em]">
          {c.personal.name || (hints && <span className="text-[#cfcfcf]">Your name</span>)}
        </H1>
        {(c.personal.headline || hints) && (
          <p className="mt-1.5 text-[11pt] text-[#555]">
            {c.personal.headline || (hints && <span className="text-[#cfcfcf]">Your headline</span>)}
          </p>
        )}
        {contacts.length > 0 && (
          <p className="mt-3 text-[8.75pt] text-[#666]">
            {contacts.map((item, i) => (
              <span key={item.key}>
                {i > 0 && <span className="px-[0.6em] text-[#bbb]">/</span>}
                <Link plain={plain} href={item.href}>{item.label}</Link>
              </span>
            ))}
          </p>
        )}
      </header>

      <div className="mt-[26px] flex flex-col gap-[20px]">
        {show.summary && (
          <Row label="About" k="summary">
            <p data-line="summary">{c.summary}</p>
          </Row>
        )}

        {show.experience && (
          <Row label="Experience" k="experience">
            <div className="flex flex-col gap-[14px]">
              {c.experience.map((e) => (
                <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-[#666]">
                    {[e.company, e.location, formatRange(e.start, e.end, e.current)].filter(Boolean).join("  ·  ")}
                  </p>
                  <Bullets items={e.bullets} className="mt-1" />
                </div>
              ))}
            </div>
          </Row>
        )}

        {show.education && (
          <Row label="Education" k="education">
            <div className="flex flex-col gap-[10px]">
              {c.education.map((e) => (
                <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                  <p className="font-medium">{[e.degree, e.field].filter(Boolean).join(", ") || e.school}</p>
                  <p className="text-[#666]">
                    {[e.degree || e.field ? e.school : "", formatRange(e.start, e.end)]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                  {e.details && <p className="mt-0.5">{e.details}</p>}
                </div>
              ))}
            </div>
          </Row>
        )}

        {show.skills && (
          <Row label="Skills" k="skills">
            <p>{c.skills.map((s) => s.name).join(", ")}</p>
          </Row>
        )}

        {show.projects && (
          <Row label="Projects" k="projects">
            <div className="flex flex-col gap-[10px]">
              {c.projects.map((p) => (
                <div key={p.id} data-entry={p.id} className="break-inside-avoid-page">
                  <p className="font-medium">
                    {p.name}
                    {p.url && (
                      <span className="font-normal text-[#666]">
                        {"  ·  "}
                        <Link plain={plain} href={p.url}>{p.url.replace(/^https?:\/\//, "")}</Link>
                      </span>
                    )}
                  </p>
                  {p.description && <p>{p.description}</p>}
                  <Bullets items={p.bullets} className="mt-0.5" />
                </div>
              ))}
            </div>
          </Row>
        )}

        {show.certifications && (
          <Row label="Certifications" k="certifications">
            <ul className="flex flex-col gap-[4px]">
              {c.certifications.map((x) => (
                <li key={x.id} data-entry={x.id}>
                  <span className="font-medium">{x.name}</span>
                  <span className="text-[#666]">
                    {[x.issuer, formatMonth(x.date)].filter(Boolean).map((v) => `  ·  ${v}`).join("")}
                  </span>
                </li>
              ))}
            </ul>
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  k,
  children,
}: {
  label: string;
  k: Parameters<typeof sectionAttrs>[0];
  children: React.ReactNode;
}) {
  return (
    <section {...sectionAttrs(k)} className="grid grid-cols-[118px_1fr] gap-x-[22px]">
      <H2 className="break-after-avoid pt-[1px] text-[8.5pt] font-medium tracking-[0.08em] text-[#888] uppercase">{label}</H2>
      <div>{children}</div>
    </section>
  );
}
