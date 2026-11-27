import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { TaskRowActions } from "@/app/(app)/tasks/task-row-actions";
import { nextActionStatus } from "@/lib/next-action-status";
import { formatDate } from "@/lib/datetime";

export type NextUpTask = { id: string; title: string; dueDate: Date; status: string; assigneeName: string };

/**
 * Round 4 screen 08 (R4OppRecord) "Next up": every open task linked to the
 * record, not just the single primaryNextTask shown by the older
 * NextActionCard. The design also shows pinned notes in this same list --
 * that needs a new `pinned` field on Activity, which doesn't exist yet and
 * isn't added here (a schema change belongs in its own reviewed pass, not
 * folded into a UI polish commit), so this card only lists open tasks.
 */
export function NextUpCard({ tasks, newTaskHref }: { tasks: NextUpTask[]; newTaskHref: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Next up</h3>
          {tasks.length === 0 ? (
            <Link href={newTaskHref} className="text-sm font-medium text-[var(--color-highlight)] hover:underline">
              Add task
            </Link>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <p className="pb-2 text-sm text-[var(--color-ink-subtle)]">No next action scheduled.</p>
        ) : (
          tasks.map((task) => {
            const status = nextActionStatus(task.dueDate);
            return (
              <div key={task.id} className="flex items-center gap-3 border-t border-[var(--color-line)] py-2.5 first:border-t-0 first:pt-0">
                <NextActionDot status={status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{task.title}</p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    Due {formatDate(task.dueDate)} · {task.assigneeName}
                  </p>
                </div>
                <TaskRowActions taskId={task.id} status={task.status} />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
