"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Timeline } from "@/components/ui/timeline";
import type { TimelineItem } from "@/lib/timeline";

type Filter = "all" | "activities" | "notes" | "emails" | "files" | "changes";

const CHIPS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "activities", label: "Activities" },
  { value: "notes", label: "Notes" },
  { value: "emails", label: "Emails" },
  { value: "files", label: "Files" },
  { value: "changes", label: "Changes" },
];

function matches(item: TimelineItem, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "changes") return item.kind === "stage_change";
  if (filter === "files") return item.kind === "file";
  if (filter === "notes") return item.kind === "activity" && item.activityType === "NOTE";
  if (filter === "emails") return item.kind === "activity" && item.activityType === "EMAIL";
  // "activities": everything logged or scheduled, excluding notes/emails which have their own chips.
  return (item.kind === "activity" && item.activityType !== "NOTE" && item.activityType !== "EMAIL") || item.kind === "task";
}

/** Round 2 section 4 "History": newest first, with All · Activities · Notes · Emails · Files · Changes filter chips. */
export function HistoryWithFilters({ items, emptyLabel }: { items: TimelineItem[]; emptyLabel: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = items.filter((i) => matches(i, filter));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={cn(
              "h-7 rounded-[3px] px-2.5 text-[12.5px]",
              filter === c.value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "bg-[var(--color-chip)] text-[var(--color-ink2)]",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Timeline items={filtered} emptyLabel={filtered.length === 0 && items.length > 0 ? "Nothing matches this filter." : emptyLabel} />
    </div>
  );
}
