"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeTaskAction, reopenTaskAction } from "./actions";
import { useWhatsNext } from "@/components/shell/whats-next-provider";

export function TaskRowActions({ taskId, status }: { taskId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const openWhatsNext = useWhatsNext();

  if (status === "COMPLETED" || status === "CANCELLED") {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => reopenTaskAction(taskId))}>
        <RotateCcw className="h-3.5 w-3.5" /> Reopen
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const summary = await completeTaskAction(taskId);
          openWhatsNext(summary);
        })
      }
    >
      <Check className="h-3.5 w-3.5" /> Complete
    </Button>
  );
}
