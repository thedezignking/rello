"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { newId, type Skill } from "@/features/resumes/schema";
import { cn } from "@/lib/utils";
import { moveItem } from "./fields";

/** Skills as chips. Type and press Enter (or paste a comma list); drag or Alt+←/→ to reorder. */
export function SkillsEditor({ skills, onChange }: { skills: Skill[]; onChange: (next: Skill[]) => void }) {
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);

  function add(raw: string) {
    const existing = new Set(skills.map((s) => s.name.toLowerCase()));
    const names = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s && !existing.has(s.toLowerCase()));
    if (!names.length) return;
    onChange([...skills, ...names.map((name) => ({ id: newId("sk"), name }))]);
    setDraft("");
  }

  return (
    <Field>
      <FieldLabel htmlFor="skill-input">Skills</FieldLabel>
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Your skills">
          {skills.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={() => setDragging(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging === null || dragging === i) return;
                const next = [...skills];
                const [item] = next.splice(dragging, 1);
                next.splice(i, 0, item);
                onChange(next);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              className={cn(
                "flex cursor-grab items-center gap-1 rounded-md border bg-card py-0.5 pr-1 pl-2.5 text-sm active:cursor-grabbing",
                dragging === i && "opacity-40",
              )}
            >
              <span
                tabIndex={0}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`${s.name}, position ${i + 1} of ${skills.length}. Alt plus arrow keys to move.`}
                onKeyDown={(e) => {
                  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                    e.preventDefault();
                    onChange(moveItem(skills, i, e.key === "ArrowLeft" ? -1 : 1));
                  }
                }}
              >
                {s.name}
              </span>
              <button
                type="button"
                onClick={() => onChange(skills.filter((x) => x.id !== s.id))}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${s.name}`}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id="skill-input"
        value={draft}
        placeholder="Type a skill and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && skills.length) {
            onChange(skills.slice(0, -1));
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,\n]/.test(text)) {
            e.preventDefault();
            add(text);
          }
        }}
        onBlur={() => add(draft)}
      />
      <FieldDescription>Put the skills you most want seen first. Drag to reorder.</FieldDescription>
    </Field>
  );
}
