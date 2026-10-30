"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { newId, type Bullet } from "@/features/resumes/schema";
import { moveItem } from "./fields";
import { useImprove } from "./improve";

/**
 * Achievement bullets. Enter adds the next bullet; Backspace on an empty
 * one removes it; Alt+↑/↓ reorders.
 */
export function BulletsEditor({
  label = "Achievements",
  bullets,
  onChange,
  placeholder,
  where = "",
}: {
  label?: string;
  bullets: Bullet[];
  onChange: (next: Bullet[]) => void;
  placeholder?: string;
  /** Where these bullets sit, for AI context ("Product Designer at Paylane"). */
  where?: string;
}) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<string | null>(null);
  // Focus in the same commit as the change, so keys typed right after
  // Enter land in the new bullet rather than the old one.
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    refs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [bullets]);
  const focusLater = (id: string) => {
    pendingFocus.current = id;
  };

  function insertAfter(index: number) {
    const b = { id: newId("b"), text: "" };
    const next = [...bullets];
    next.splice(index + 1, 0, b);
    onChange(next);
    focusLater(b.id);
  }

  function move(index: number, dir: -1 | 1) {
    const id = bullets[index].id;
    onChange(moveItem(bullets, index, dir));
    focusLater(id);
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {bullets.map((b, i) => (
            <BulletRow
              key={b.id}
              bullet={b}
              index={i}
              count={bullets.length}
              label={label}
              where={where}
              placeholder={i === 0 ? placeholder : undefined}
              register={(el) => {
                if (el) refs.current.set(b.id, el);
                else refs.current.delete(b.id);
              }}
              setText={(text) => onChange(bullets.map((x) => (x.id === b.id ? { ...x, text } : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  insertAfter(i);
                } else if (e.key === "Backspace" && !b.text && bullets.length > 0) {
                  e.preventDefault();
                  onChange(bullets.filter((x) => x.id !== b.id));
                  const prev = bullets[i - 1] ?? bullets[i + 1];
                  if (prev) focusLater(prev.id);
                } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault();
                  move(i, e.key === "ArrowUp" ? -1 : 1);
                }
              }}
              move={(dir) => move(i, dir)}
              remove={() => onChange(bullets.filter((x) => x.id !== b.id))}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => insertAfter(bullets.length - 1)}>
          <PlusIcon data-icon="inline-start" />
          Add bullet
        </Button>
        {bullets.length > 1 && (
          <FieldDescription className="text-xs">Enter adds a line · Alt+↑↓ reorders</FieldDescription>
        )}
      </div>
    </div>
  );
}

function BulletRow({
  bullet,
  index,
  count,
  label,
  where,
  placeholder,
  register,
  setText,
  onKeyDown,
  move,
  remove,
}: {
  bullet: Bullet;
  index: number;
  count: number;
  label: string;
  where: string;
  placeholder?: string;
  register: (el: HTMLTextAreaElement | null) => void;
  setText: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
}) {
  const { trigger, panel } = useImprove({
    text: bullet.text,
    where: `${label} bullet${where ? ` — ${where}` : ""}`,
    onAccept: setText,
    compact: true,
  });

  return (
    <li className="group/bullet flex flex-col gap-1.5">
      <div className="flex items-start gap-1.5">
        <span aria-hidden className="mt-[15px] size-1 shrink-0 rounded-full bg-muted-foreground/60" />
        <Textarea
          ref={register}
          value={bullet.text}
          rows={1}
          aria-label={`${label} ${index + 1}`}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          className="field-sizing-content min-h-9 resize-none py-1.5"
        />
        <div className="flex shrink-0 opacity-0 transition-opacity group-focus-within/bullet:opacity-100 group-hover/bullet:opacity-100 has-[[aria-expanded=true]]:opacity-100 has-[[data-slot=spinner]]:opacity-100">
          {trigger}
          <Button variant="ghost" size="icon-sm" onClick={() => move(-1)} disabled={index === 0} aria-label="Move bullet up">
            <ArrowUpIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => move(1)} disabled={index === count - 1} aria-label="Move bullet down">
            <ArrowDownIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Remove bullet">
            <XIcon />
          </Button>
        </div>
      </div>
      {panel && <div className="ml-2.5">{panel}</div>}
    </li>
  );
}
