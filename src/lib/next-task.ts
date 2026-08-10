import "server-only";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@prisma/client";

const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

async function earliestOpenTaskId(where: Record<string, unknown>) {
  const task = await prisma.task.findFirst({
    where: { archivedAt: null, status: { in: OPEN_STATUSES }, ...where },
    orderBy: { dueDate: "asc" },
    select: { id: true },
  });
  return task?.id ?? null;
}

/**
 * Recomputes and persists `primaryNextTaskId` (the earliest open task) on
 * whichever of these records a task is linked to. Task create/complete/
 * reopen/reschedule don't update the parent record automatically, so every
 * call site that changes a task's status or due date needs to call this
 * afterward for the pipeline "next action" indicator and the Reports
 * "no next action" counts to stay accurate.
 */
export async function syncPrimaryNextTask(links: {
  opportunityId?: string | null;
  mandateId?: string | null;
  candidateProcessId?: string | null;
  intelligenceItemId?: string | null;
}) {
  await Promise.all([
    links.opportunityId
      ? earliestOpenTaskId({ opportunities: { some: { opportunityId: links.opportunityId } } }).then((id) =>
          prisma.opportunity.update({ where: { id: links.opportunityId! }, data: { primaryNextTaskId: id } }),
        )
      : null,
    links.mandateId
      ? earliestOpenTaskId({ mandates: { some: { mandateId: links.mandateId } } }).then((id) =>
          prisma.mandate.update({ where: { id: links.mandateId! }, data: { primaryNextTaskId: id } }),
        )
      : null,
    links.candidateProcessId
      ? earliestOpenTaskId({ candidateProcesses: { some: { candidateProcessId: links.candidateProcessId } } }).then((id) =>
          prisma.candidateProcess.update({ where: { id: links.candidateProcessId! }, data: { primaryNextTaskId: id } }),
        )
      : null,
    links.intelligenceItemId
      ? earliestOpenTaskId({ intelligenceItems: { some: { intelligenceItemId: links.intelligenceItemId } } }).then((id) =>
          prisma.intelligenceItem.update({ where: { id: links.intelligenceItemId! }, data: { primaryNextTaskId: id } }),
        )
      : null,
  ]);
}

/** Links for a task fetched with its join rows included, in the shape `syncPrimaryNextTask` expects. */
export function linksFromTask(task: {
  opportunities: { opportunityId: string }[];
  mandates: { mandateId: string }[];
  candidateProcesses: { candidateProcessId: string }[];
  intelligenceItems: { intelligenceItemId: string }[];
}) {
  return {
    opportunityId: task.opportunities[0]?.opportunityId,
    mandateId: task.mandates[0]?.mandateId,
    candidateProcessId: task.candidateProcesses[0]?.candidateProcessId,
    intelligenceItemId: task.intelligenceItems[0]?.intelligenceItemId,
  };
}
