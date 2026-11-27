"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { completeTaskAction, reopenTaskAction } from "./actions";
import { useWhatsNext } from "@/components/shell/whats-next-provider";
import { cn } from "@/lib/utils";

export function TaskCheckbox({ taskId, completed }: { taskId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const openWhatsNext = useWhatsNext();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={completed ? "Mark as not done" : "Mark as done"}
      onClick={() =>
        startTransition(async () => {
          if (completed) {
            await reopenTaskAction(taskId);
          } else {
            const summary = await completeTaskAction(taskId);
            openWhatsNext(summary);
          }
        })
      }
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]",
        completed ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "border-[var(--color-muted)] text-transparent",
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </button>
  );
}
