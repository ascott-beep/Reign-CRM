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

  return (
    <aside className="flex w-[320px] shrink-0 flex-col gap-1 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
      <h2 className="m-0 text-base font-medium">Suggested from your pipeline</h2>
      <p className="mt-1 text-[13px] text-[var(--color-muted)]">Generated from stage rules. Add one to make it a task.</p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">Nothing suggested right now.</p>
      ) : (
        <div className="mt-3 flex flex-col">
          {visible.map((s, i) => (
            <div key={s.id} className={`flex items-start justify-between gap-3 py-3 ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}>
              <div className="min-w-0">
                <div className="text-[13.5px]">{s.title}</div>
                <div className="mt-0.5 text-xs text-[var(--color-muted)]">{s.subtitle}</div>
              </div>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => add(s)} className="shrink-0">
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
        Rules live in Settings › Stale thresholds
      </p>
    </aside>
  );
}
