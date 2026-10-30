"use client";

import { useId, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeContent } from "@/features/resumes/schema";
import { cn } from "@/lib/utils";

export type Update = (fn: (c: ResumeContent) => ResumeContent) => void;

type ListKey = "experience" | "education" | "projects" | "certifications";
type ItemOf<K extends ListKey> = ResumeContent[K][number];

/** add / patch / remove / move for one of the repeatable sections. */
export function listOps<K extends ListKey>(key: K, update: Update) {
  const set = (fn: (list: ItemOf<K>[]) => ItemOf<K>[]) =>
    update((c) => ({ ...c, [key]: fn(c[key] as ItemOf<K>[]) }));
  return {
    add: (item: ItemOf<K>) => set((l) => [...l, item]),
    patch: (id: string, p: Partial<ItemOf<K>>) =>
      set((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x))),
    remove: (id: string) => set((l) => l.filter((x) => x.id !== id)),
    move: (id: string, dir: -1 | 1) => set((l) => moveItem(l, l.findIndex((x) => x.id === id), dir)),
  };
}

export function moveItem<T>(list: T[], index: number, dir: -1 | 1) {
  const to = index + dir;
  if (index < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

const validators = {
  email: (v: string) => !v || /^\S+@\S+\.\S+$/.test(v) || "Enter a valid email, like you@example.com.",
  url: (v: string) =>
    !v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v) || "Enter a web address, like example.com.",
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  validate,
  description,
  className,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url" | "month";
  validate?: keyof typeof validators;
  description?: string;
  className?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const check = validate ? validators[validate](value.trim()) : true;
  const error = touched && check !== true ? check : null;

  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={!!error || undefined}
      />
      {error ? <FieldError>{error}</FieldError> : description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  placeholder,
  description,
  rows = 3,
  action,
  below,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
  rows?: number;
  /** Sits at the end of the label row (e.g. an Improve menu). */
  action?: React.ReactNode;
  /** Sits under the field (e.g. an AI suggestion). */
  below?: React.ReactNode;
}) {
  const id = useId();
  return (
    <Field>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {action}
      </div>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-sizing-content min-h-20"
      />
      {below}
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

/** One repeatable entry (a job, a degree…) with reorder and remove controls. */
export function EntryCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-4">
      <div className="mb-3 flex items-center gap-1">
        <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", !title && "text-muted-foreground")}>
          {title || "New entry"}
        </p>
        <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move down"
        >
          <ArrowDownIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove entry">
          <Trash2Icon />
        </Button>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
