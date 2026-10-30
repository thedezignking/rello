"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { newId, type ResumeContent, type SectionKey } from "@/features/resumes/schema";
import { BulletsEditor } from "./bullets-editor";
import { useImprove } from "./improve";
import { AreaField, EntryCard, listOps, TextField, type Update } from "./fields";
import { SkillsEditor } from "./skills-editor";

type Props = { content: ResumeContent; update: Update };

export const SECTIONS: { key: SectionKey; title: string; Body: (p: Props) => React.ReactNode; count?: (c: ResumeContent) => number }[] = [
  { key: "personal", title: "Personal details", Body: PersonalSection },
  { key: "summary", title: "Summary", Body: SummarySection },
  { key: "experience", title: "Experience", Body: ExperienceSection, count: (c) => c.experience.length },
  { key: "education", title: "Education", Body: EducationSection, count: (c) => c.education.length },
  { key: "skills", title: "Skills", Body: SkillsSection, count: (c) => c.skills.length },
  { key: "projects", title: "Projects", Body: ProjectsSection, count: (c) => c.projects.length },
  { key: "certifications", title: "Certifications", Body: CertificationsSection, count: (c) => c.certifications.length },
];

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="outline" className="w-full border-dashed" onClick={onClick}>
      <PlusIcon data-icon="inline-start" />
      {children}
    </Button>
  );
}

function PersonalSection({ content, update }: Props) {
  const p = content.personal;
  const set = (k: keyof typeof p) => (v: string) =>
    update((c) => ({ ...c, personal: { ...c.personal, [k]: v } }));
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <TextField label="Full name" value={p.name} onChange={set("name")} autoComplete="name" placeholder="Amara Okafor" />
        <TextField label="Headline" value={p.headline} onChange={set("headline")} placeholder="Product Designer" />
        <TextField label="Email" type="email" validate="email" value={p.email} onChange={set("email")} autoComplete="email" />
        <TextField label="Phone" type="tel" value={p.phone} onChange={set("phone")} autoComplete="tel" />
        <TextField label="City, country" value={p.location} onChange={set("location")} placeholder="Lagos, Nigeria" />
        <TextField label="LinkedIn" validate="url" value={p.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/you" />
      </Grid>
      <TextField label="Website or portfolio" validate="url" value={p.website} onChange={set("website")} placeholder="yourname.com" />
    </div>
  );
}

function SummarySection({ content, update }: Props) {
  const words = content.summary.trim() ? content.summary.trim().split(/\s+/).length : 0;
  const setSummary = (v: string) => update((c) => ({ ...c, summary: v }));
  const { trigger, panel } = useImprove({
    text: content.summary,
    where: `Professional summary${content.personal.headline ? ` for a ${content.personal.headline}` : ""}`,
    onAccept: setSummary,
  });
  return (
    <AreaField
      label="Professional summary"
      value={content.summary}
      onChange={setSummary}
      action={trigger}
      below={panel}
      rows={4}
      placeholder="Two or three sentences on who you are, what you do best, and what you're looking for."
      description={words ? `${words} words · 40–100 reads well` : "40–100 words reads well."}
    />
  );
}

function ExperienceSection({ content, update }: Props) {
  const ops = listOps("experience", update);
  return (
    <div className="flex flex-col gap-3">
      {content.experience.map((e, i) => (
        <EntryCard
          key={e.id}
          title={[e.title, e.company].filter(Boolean).join(" · ")}
          index={i}
          count={content.experience.length}
          onMove={(d) => ops.move(e.id, d)}
          onRemove={() => ops.remove(e.id)}
        >
          <Grid>
            <TextField label="Job title" value={e.title} onChange={(v) => ops.patch(e.id, { title: v })} />
            <TextField label="Company" value={e.company} onChange={(v) => ops.patch(e.id, { company: v })} />
            <TextField label="Start" type="month" value={e.start} onChange={(v) => ops.patch(e.id, { start: v })} />
            {!e.current && (
              <TextField label="End" type="month" value={e.end} onChange={(v) => ops.patch(e.id, { end: v })} />
            )}
          </Grid>
          <Field orientation="horizontal">
            <Checkbox
              id={`${e.id}-current`}
              checked={e.current}
              onCheckedChange={(v) => ops.patch(e.id, { current: !!v, end: v ? "" : e.end })}
            />
            <FieldLabel htmlFor={`${e.id}-current`} className="font-normal">
              I currently work here
            </FieldLabel>
          </Field>
          <TextField label="Location" value={e.location} onChange={(v) => ops.patch(e.id, { location: v })} placeholder="City, or Remote" />
          <BulletsEditor
            bullets={e.bullets}
            onChange={(bullets) => ops.patch(e.id, { bullets })}
            placeholder="What you did and what changed because of it"
            where={[e.title, e.company].filter(Boolean).join(" at ")}
          />
        </EntryCard>
      ))}
      <AddButton
        onClick={() =>
          ops.add({
            id: newId("exp"),
            title: "",
            company: "",
            location: "",
            start: "",
            end: "",
            current: false,
            bullets: [{ id: newId("b"), text: "" }],
          })
        }
      >
        Add experience
      </AddButton>
    </div>
  );
}

function EducationSection({ content, update }: Props) {
  const ops = listOps("education", update);
  return (
    <div className="flex flex-col gap-3">
      {content.education.map((e, i) => (
        <EntryCard
          key={e.id}
          title={[e.degree, e.school].filter(Boolean).join(" · ")}
          index={i}
          count={content.education.length}
          onMove={(d) => ops.move(e.id, d)}
          onRemove={() => ops.remove(e.id)}
        >
          <TextField label="School" value={e.school} onChange={(v) => ops.patch(e.id, { school: v })} />
          <Grid>
            <TextField label="Degree or qualification" value={e.degree} onChange={(v) => ops.patch(e.id, { degree: v })} placeholder="B.Sc." />
            <TextField label="Field of study" value={e.field} onChange={(v) => ops.patch(e.id, { field: v })} />
            <TextField label="Start (optional)" type="month" value={e.start} onChange={(v) => ops.patch(e.id, { start: v })} />
            <TextField label="Graduated or expected" type="month" value={e.end} onChange={(v) => ops.patch(e.id, { end: v })} />
          </Grid>
          <AreaField
            label="Details (optional)"
            value={e.details}
            rows={2}
            onChange={(v) => ops.patch(e.id, { details: v })}
            placeholder="Honours, thesis, relevant courses"
          />
        </EntryCard>
      ))}
      <AddButton
        onClick={() =>
          ops.add({ id: newId("edu"), school: "", degree: "", field: "", start: "", end: "", details: "" })
        }
      >
        Add education
      </AddButton>
    </div>
  );
}

function SkillsSection({ content, update }: Props) {
  return <SkillsEditor skills={content.skills} onChange={(skills) => update((c) => ({ ...c, skills }))} />;
}

function ProjectsSection({ content, update }: Props) {
  const ops = listOps("projects", update);
  return (
    <div className="flex flex-col gap-3">
      {content.projects.map((p, i) => (
        <EntryCard
          key={p.id}
          title={p.name}
          index={i}
          count={content.projects.length}
          onMove={(d) => ops.move(p.id, d)}
          onRemove={() => ops.remove(p.id)}
        >
          <Grid>
            <TextField label="Project name" value={p.name} onChange={(v) => ops.patch(p.id, { name: v })} />
            <TextField label="Link (optional)" validate="url" value={p.url} onChange={(v) => ops.patch(p.id, { url: v })} />
          </Grid>
          <ProjectDescription
            name={p.name}
            value={p.description}
            onChange={(v) => ops.patch(p.id, { description: v })}
          />
          <BulletsEditor
            label="Highlights"
            bullets={p.bullets}
            onChange={(bullets) => ops.patch(p.id, { bullets })}
            where={p.name ? `Project: ${p.name}` : "Project"}
          />
        </EntryCard>
      ))}
      <AddButton
        onClick={() => ops.add({ id: newId("pr"), name: "", url: "", description: "", bullets: [] })}
      >
        Add project
      </AddButton>
    </div>
  );
}

function ProjectDescription({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { trigger, panel } = useImprove({
    text: value,
    where: `Project description${name ? `: ${name}` : ""}`,
    onAccept: onChange,
  });
  return <AreaField label="Description" value={value} rows={2} onChange={onChange} action={trigger} below={panel} />;
}

function CertificationsSection({ content, update }: Props) {
  const ops = listOps("certifications", update);
  return (
    <div className="flex flex-col gap-3">
      {content.certifications.map((x, i) => (
        <EntryCard
          key={x.id}
          title={x.name}
          index={i}
          count={content.certifications.length}
          onMove={(d) => ops.move(x.id, d)}
          onRemove={() => ops.remove(x.id)}
        >
          <Grid>
            <TextField label="Certification" value={x.name} onChange={(v) => ops.patch(x.id, { name: v })} />
            <TextField label="Issued by" value={x.issuer} onChange={(v) => ops.patch(x.id, { issuer: v })} />
            <TextField label="Date (optional)" type="month" value={x.date} onChange={(v) => ops.patch(x.id, { date: v })} />
            <TextField label="Verification link" validate="url" value={x.url} onChange={(v) => ops.patch(x.id, { url: v })} />
          </Grid>
        </EntryCard>
      ))}
      <AddButton
        onClick={() => ops.add({ id: newId("cert"), name: "", issuer: "", date: "", url: "" })}
      >
        Add certification
      </AddButton>
    </div>
  );
}
