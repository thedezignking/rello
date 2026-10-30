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

const ACCENT = "#1f4fa8";

// Modern: left-aligned sans, blue headline and section labels, skills as tags.
export function ModernTemplate({ content: c, hints, plain }: TemplateProps) {
  const show = visibleSections(c);
  const contacts = contactItems(c.personal);

  return (
    <div className="px-[56px] py-[50px] print:py-0 font-[family-name:var(--font-doc-sans)] text-[10pt] leading-[1.5] text-[#1d2330]">
      <header {...sectionAttrs("personal")}>
        <H1 className="text-[25pt] leading-[1.1] font-semibold tracking-[-0.02em]">
          {c.personal.name || (hints && <span className="text-[#c9ccd3]">Your name</span>)}
        </H1>
        {(c.personal.headline || hints) && (
          <p className="mt-1 text-[12pt] font-medium" style={{ color: ACCENT }}>
            {c.personal.headline || (hints && <span className="text-[#c9ccd3]">Your headline</span>)}
          </p>
        )}
        {/* Real separator characters, so ATS text extraction keeps items apart. */}
        {contacts.length > 0 && (
          <p className="mt-2.5 text-[9pt] text-[#4a5160]">
            {contacts.map((item, i) => (
              <span key={item.key}>
                {i > 0 && <span className="px-[7px] text-[#c3c8d2]">|</span>}
                <Link plain={plain} href={item.href}>
                  {item.label}
                </Link>
              </span>
            ))}
          </p>
        )}
      </header>

      {show.summary && (
        <Section title="Profile" k="summary">
          <p data-line="summary" className="text-[#333a47]">{c.summary}</p>
        </Section>
      )}

      {show.experience && (
        <Section title="Experience" k="experience">
          <div className="flex flex-col gap-[12px]">
            {c.experience.map((e) => (
              <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-4">
                  <p>
                    <span className="font-semibold">{e.title}</span>
                    {e.company && <span className="text-[#4a5160]"> · {e.company}</span>}
                  </p>
                  <p className="shrink-0 text-[9pt] text-[#6b7280] tabular-nums">
                    {formatRange(e.start, e.end, e.current)}
                  </p>
                </div>
                {e.location && <p className="text-[9pt] text-[#6b7280]">{e.location}</p>}
                <Bullets items={e.bullets} className="mt-1 text-[#2a303c]" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.skills && (
        <Section title="Skills" k="skills">
          <ul className="flex flex-wrap gap-[5px]">
            {c.skills.map((s) => (
              <li key={s.id} className="rounded-[3px] bg-[#eef2fa] px-[7px] py-[1px] text-[9pt] text-[#24304a]">
                {s.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {show.education && (
        <Section title="Education" k="education">
          <div className="flex flex-col gap-[8px]">
            {c.education.map((e) => (
              <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-4">
                  <p>
                    <span className="font-semibold">{[e.degree, e.field].filter(Boolean).join(", ")}</span>
                    {e.school && <span className="text-[#4a5160]"> · {e.school}</span>}
                  </p>
                  <p className="shrink-0 text-[9pt] text-[#6b7280] tabular-nums">{formatRange(e.start, e.end)}</p>
                </div>
                {e.details && <p className="text-[#333a47]">{e.details}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.projects && (
        <Section title="Projects" k="projects">
          <div className="flex flex-col gap-[8px]">
            {c.projects.map((p) => (
              <div key={p.id} data-entry={p.id} className="break-inside-avoid-page">
                <p>
                  <span className="font-semibold">{p.name}</span>
                  {p.url && (
                    <span className="text-[9pt] text-[#6b7280]">
                      {" "}· <Link plain={plain} href={p.url}>{p.url.replace(/^https?:\/\//, "")}</Link>
                    </span>
                  )}
                </p>
                {p.description && <p className="text-[#333a47]">{p.description}</p>}
                <Bullets items={p.bullets} className="mt-0.5" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.certifications && (
        <Section title="Certifications" k="certifications">
          <ul className="flex flex-col gap-[3px]">
            {c.certifications.map((x) => (
              <li key={x.id} data-entry={x.id} className="flex items-baseline justify-between gap-4">
                <span>
                  <span className="font-semibold">{x.name}</span>
                  {x.issuer && <span className="text-[#4a5160]"> · {x.issuer}</span>}
                </span>
                <span className="shrink-0 text-[9pt] text-[#6b7280]">{formatMonth(x.date)}</span>
              </li>
            ))}
          </ul>
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
    <section {...sectionAttrs(k)} className="mt-[18px]">
      <H2
        className="break-after-avoid mb-[7px] flex items-center gap-[10px] text-[9pt] font-semibold tracking-[0.14em] uppercase"
        style={{ color: ACCENT }}
      >
        {title}
        <span aria-hidden className="h-px flex-1 bg-[#dfe4ee]" />
      </H2>
      {children}
    </section>
  );
}
