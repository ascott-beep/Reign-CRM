"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addSuggestedTaskAction } from "./suggested-task-actions";
import type { Suggestion } from "./suggestions";

export function SuggestedTasksPanel({ suggestions }: { suggestions: Suggestion[] }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function add(s: Suggestion) {
    startTransition(async () => {
      if (s.kind === "FIRST_CALL" || s.kind === "CHASE_OFFER") {
        await addSuggestedTaskAction({ kind: s.kind, candidateProcessId: s.candidateProcessId, title: s.title });
      } else if (s.kind === "SET_NEXT_STEPS") {
        await addSuggestedTaskAction({ kind: "SET_NEXT_STEPS", title: s.title });
      } else {
        const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        await addSuggestedTaskAction({ kind: "GUARANTEE_CHECKIN", placementId: s.placementId, title: s.title, dueDate });
      }
      setAdded((prev) => new Set(prev).add(s.id));
    });
  }

  const visible = suggestions.filter((s) => !added.has(s.id));
  if (visible.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
      <div className="flex items-baseline gap-2 px-5 pt-4 text-sm font-medium">
        <span>Suggested from your pipeline</span>
        <span className="text-[var(--color-muted)]">{visible.length}</span>
      </div>
      <div className="mt-1 pb-1">
        {visible.map((s) => (
          <div key={s.id} className="flex items-center gap-4 border-t border-[var(--color-line)] px-5 py-3 text-[13.5px]">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[var(--color-ink)]">{s.title}</div>
              <div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{s.subtitle}</div>
            </div>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => add(s)} className="shrink-0">
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
