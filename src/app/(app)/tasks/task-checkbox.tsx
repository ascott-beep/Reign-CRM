"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { completeTaskAction, reopenTaskAction } from "./actions";
import { useWhatsNext } from "@/components/shell/whats-next-provider";
import { useToast } from "@/components/shell/toast-provider";
import { cn } from "@/lib/utils";

/**
 * Round 5 screen 12 — ticking a task strikes it through and keeps it in
 * place in its current tab until the page is left or refreshed, instead of
 * jumping to Done immediately. The parent (Row) owns this local "completed"
 * flag and only flips it on click; it deliberately never re-syncs from the
 * server's revalidated data on this same render, so the row stays put.
 */
export function TaskCheckbox({
  taskId,
  completed,
  onToggle,
}: {
  taskId: string;
  completed: boolean;
  onToggle: (completed: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const openWhatsNext = useWhatsNext();
  const { showToast } = useToast();

  function markDone() {
    onToggle(true);
    startTransition(async () => {
      const summary = await completeTaskAction(taskId);
      openWhatsNext(summary);
    });
    showToast({
      kind: "undo",
      title: "Task done",
      actionLabel: "Undo",
      onAction: () => {
        onToggle(false);
        reopenTaskAction(taskId);
      },
    });
  }

  function reopen() {
    onToggle(false);
    startTransition(() => {
      reopenTaskAction(taskId);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={completed ? "Mark as not done" : "Mark as done"}
      onClick={completed ? reopen : markDone}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]",
        completed ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "border-[var(--color-muted)] text-transparent",
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </button>
  );
}
