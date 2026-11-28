"use client";

import { useState } from "react";
import { TaskRow } from "./task-row";
import type { TaskWithLinks } from "./page";

type Group = { key: string; label: string; tasks: TaskWithLinks[]; warn?: boolean };

/**
 * Round 5 screen 12 — freezes the whole list (and its section counts) at
 * mount, so a task ticked off here stays visible with a strikethrough in
 * its current tab instead of jumping to Done. This has to happen at the
 * section/list level, not per row: completing a task runs a server action
 * that revalidates this page, so the next time Next.js merges fresh data
 * into the current tree, any row whose task fell out of the server's
 * "open" query would otherwise be unmounted outright (losing its own local
 * state along with it) rather than just re-styled. Capturing the groups
 * once via useState's lazy initializer, and never updating that state from
 * later props, means this component keeps rendering its original snapshot
 * regardless of what the server recomputes, until a real navigation
 * (leaving the page, or a hard refresh) remounts it from scratch.
 */
export function TaskListSection({ groups, emptyText }: { groups: Group[]; emptyText: string }) {
  const [frozenGroups] = useState(groups);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(frozenGroups.flatMap((g) => g.tasks).filter((t) => t.status === "COMPLETED").map((t) => t.id)),
  );

  function toggle(taskId: string, completed: boolean) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (completed) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  const isEmpty = frozenGroups.every((g) => g.tasks.length === 0);

  return (
    <div className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
      {frozenGroups.map((g) => (
        <div key={g.key}>
          {frozenGroups.length > 1 ? (
            <div className={`flex items-baseline gap-2 border-t border-[var(--color-line)] px-5 pt-4 text-sm font-medium first:border-t-0 ${g.warn ? "text-[var(--color-warn)]" : ""}`}>
              <span>{g.label}</span>
              <span className="text-[var(--color-muted)]">{g.tasks.length}</span>
            </div>
          ) : null}
          {g.tasks.map((t) => (
            <TaskRow key={t.id} t={t} completed={completedIds.has(t.id)} onToggle={(c) => toggle(t.id, c)} />
          ))}
        </div>
      ))}
      {isEmpty ? <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">{emptyText}</p> : null}
    </div>
  );
}
