"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { taskFormSchema } from "@/lib/validation/task";
import { writeAuditLog } from "@/lib/audit";
import { syncPrimaryNextTask, linksFromTask } from "@/lib/next-task";

export type TaskFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

function backLinkFor(data: {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  intelligenceItemId?: string;
}) {
  if (data.organizationId) return `/organisations/${data.organizationId}`;
  if (data.personId) return `/people/${data.personId}`;
  if (data.opportunityId) return `/opportunities/${data.opportunityId}`;
  if (data.mandateId) return `/mandates/${data.mandateId}`;
  if (data.intelligenceItemId) return `/intelligence/${data.intelligenceItemId}`;
  return "/tasks";
}

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = taskFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  }
  const data = parsed.data;

  const relatedRecordType = data.mandateId
    ? "MANDATE"
    : data.opportunityId
      ? "OPPORTUNITY"
      : data.organizationId
        ? "ORGANIZATION"
        : data.personId
          ? "PERSON"
          : data.intelligenceItemId
            ? "INTELLIGENCE_ITEM"
            : data.candidateProcessId
              ? "CANDIDATE_PROCESS"
              : undefined;
  const relatedRecordId = data.mandateId ?? data.opportunityId ?? data.organizationId ?? data.personId ?? data.intelligenceItemId ?? data.candidateProcessId;

  const task = await prisma.task.create({
    data: {
      workspaceId: user.workspaceId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      status: data.status,
      priority: data.priority,
      assignedUserId: data.assignedUserId,
      createdById: user.id,
      dueDate: data.dueDate,
      dueTime: data.dueTime ?? null,
      relatedRecordType: relatedRecordType as any,
      relatedRecordId,
      organizations: data.organizationId ? { create: [{ organizationId: data.organizationId }] } : undefined,
      people: data.personId ? { create: [{ personId: data.personId }] } : undefined,
      opportunities: data.opportunityId ? { create: [{ opportunityId: data.opportunityId }] } : undefined,
      mandates: data.mandateId ? { create: [{ mandateId: data.mandateId }] } : undefined,
      candidateProcesses: data.candidateProcessId ? { create: [{ candidateProcessId: data.candidateProcessId }] } : undefined,
      intelligenceItems: data.intelligenceItemId ? { create: [{ intelligenceItemId: data.intelligenceItemId }] } : undefined,
    },
  });

  await prisma.inAppNotification.create({
    data: {
      userId: data.assignedUserId,
      type: "TASK_ASSIGNED",
      title: `New task: ${task.title}`,
      relatedTaskId: task.id,
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Task", entityId: task.id, action: "CREATE" });
  await syncPrimaryNextTask({ opportunityId: data.opportunityId, mandateId: data.mandateId, candidateProcessId: data.candidateProcessId, intelligenceItemId: data.intelligenceItemId });

  revalidatePath("/tasks");
  redirect(backLinkFor(data));
}

const TASK_LINK_INCLUDE = { opportunities: true, mandates: true, candidateProcesses: true, intelligenceItems: true } as const;

export async function completeTaskAction(taskId: string, completionNote?: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date(), completionNote: completionNote || null },
    include: TASK_LINK_INCLUDE,
  });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Task", entityId: taskId, action: "UPDATE", changedFields: { status: "COMPLETED" } });
  await syncPrimaryNextTask(linksFromTask(task));
  revalidatePath("/tasks");
}

export async function reopenTaskAction(taskId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  const task = await prisma.task.update({ where: { id: taskId }, data: { status: "TODO", completedAt: null }, include: TASK_LINK_INCLUDE });
  await syncPrimaryNextTask(linksFromTask(task));
  revalidatePath("/tasks");
}

export async function rescheduleTaskAction(taskId: string, dueDate: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  const task = await prisma.task.update({ where: { id: taskId }, data: { dueDate: new Date(dueDate) }, include: TASK_LINK_INCLUDE });
  await syncPrimaryNextTask(linksFromTask(task));
  revalidatePath("/tasks");
}

export async function reassignTaskAction(taskId: string, assignedUserId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  await prisma.task.update({ where: { id: taskId }, data: { assignedUserId } });
  await prisma.inAppNotification.create({
    data: { userId: assignedUserId, type: "TASK_ASSIGNED", title: "A task was reassigned to you", relatedTaskId: taskId },
  });
  revalidatePath("/tasks");
}
