import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { TaskRowActions } from "@/app/(app)/tasks/task-row-actions";
import { nextActionStatus } from "@/lib/next-action-status";

export function NextActionCard({
  task,
  newTaskHref,
}: {
  task: { id: string; title: string; dueDate: Date; status: string; assigneeName: string } | null;
  newTaskHref: string;
}) {
  if (!task) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-3.5">
          <p className="text-sm text-[var(--color-ink-subtle)]">No next action scheduled.</p>
          <Link href={newTaskHref} className="text-sm font-medium text-[var(--color-highlight)] hover:underline">
            Add task
          </Link>
        </CardContent>
      </Card>
    );
  }

  const status = nextActionStatus(task.dueDate);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3.5">
        <NextActionDot status={status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-ink)]">{task.title}</p>
          <p className="text-xs text-[var(--color-ink-subtle)]">
            Due {format(task.dueDate, "d MMM yyyy")} · {task.assigneeName}
          </p>
        </div>
        <TaskRowActions taskId={task.id} status={task.status} />
      </CardContent>
    </Card>
  );
}
