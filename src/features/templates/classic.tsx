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

// Classic: centered serif header, small-caps headings over hairline rules.
export function ClassicTemplate({ content: c, hints, plain }: TemplateProps) {
  const show = visibleSections(c);
  const contacts = contactItems(c.personal);

  return (
    <div className="px-[60px] py-[52px] print:py-0 font-[family-name:var(--font-doc-serif)] text-[10.5pt] leading-[1.42] text-[#1b1b1b]">
      <header {...sectionAttrs("personal")} className="text-center">
        <h1 className="text-[23pt] leading-tight font-semibold tracking-[-0.01em]">
          {c.personal.name || (hints && <span className="text-[#c4c4c4]">Your name</span>)}
        </h1>
        {(c.personal.headline || hints) && (
          <p className="mt-1 text-[11pt] italic text-[#444]">
            {c.personal.headline || (hints && <span className="text-[#c4c4c4]">Your headline</span>)}
          </p>
        )}
        {contacts.length > 0 && (
          <p className="mt-2 text-[9.5pt] text-[#444]">
            {contacts.map((item, i) => (
              <span key={item.key}>
                {i > 0 && <span className="px-[0.5em] text-[#999]">·</span>}
                <Link plain={plain} href={item.href}>{item.label}</Link>
              </span>
            ))}
          </p>
        )}
      </header>

      {show.summary && (
        <Section title="Summary" k="summary">
          <p data-line="summary">{c.summary}</p>
        </Section>
      )}

      {show.experience && (
        <Section title="Experience" k="experience">
          <div className="flex flex-col gap-[10px]">
            {c.experience.map((e) => (
              <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold">{e.title}</p>
                  <p className="shrink-0 text-[9.5pt] text-[#555]">{formatRange(e.start, e.end, e.current)}</p>
                </div>
                {(e.company || e.location) && (
                  <p className="italic text-[#444]">
                    {[e.company, e.location].filter(Boolean).join(", ")}
                  </p>
                )}
                <Bullets items={e.bullets} className="mt-1" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.education && (
        <Section title="Education" k="education">
          <div className="flex flex-col gap-[8px]">
            {c.education.map((e) => (
              <div key={e.id} data-entry={e.id} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-semibold">{e.school}</p>
                  <p className="shrink-0 text-[9.5pt] text-[#555]">{formatRange(e.start, e.end)}</p>
                </div>
                {(e.degree || e.field) && (
                  <p className="italic text-[#444]">{[e.degree, e.field].filter(Boolean).join(", ")}</p>
                )}
                {e.details && <p className="mt-0.5">{e.details}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {show.skills && (
        <Section title="Skills" k="skills">
          <p>{c.skills.map((s) => s.name).join(" · ")}</p>
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
                    <span className="text-[9.5pt] text-[#555]">
                      {" "}— <Link plain={plain} href={p.url}>{p.url.replace(/^https?:\/\//, "")}</Link>
                    </span>
                  )}
                </p>
                {p.description && <p>{p.description}</p>}
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
                  {x.issuer && <span className="text-[#444]">, {x.issuer}</span>}
                </span>
                <span className="shrink-0 text-[9.5pt] text-[#555]">{formatMonth(x.date)}</span>
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
    <section {...sectionAttrs(k)} className="mt-[16px]">
      <h2 className="break-after-avoid mb-[6px] border-b border-[#bdbdbd] pb-[2px] text-[10pt] font-semibold tracking-[0.12em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
