"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Phone/tablet switcher between a form and its page: a standard segmented
// control under the header. Equal-width segments, centred; full width on
// phones (thumb-sized halves, like iOS). The selected segment is the raised
// white one, so it reads clearly against the grey track.
export function ViewTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    // -mt-px hides the header's bottom border so the two read as one bar.
    <div className="relative -mt-px flex justify-center border-b bg-card px-4 pb-3 lg:hidden">
      <Tabs value={value} onValueChange={(v) => onChange(v as T)} className="w-full sm:w-80">
        <TabsList className="h-9! w-full">
          {items.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="data-active:bg-card">
              {item.label}
              {!!item.count && (
                <span className="rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary tabular-nums">
                  {item.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
