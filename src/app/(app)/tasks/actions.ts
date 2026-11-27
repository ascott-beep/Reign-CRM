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

const TASK_LINK_INCLUDE = {
  opportunities: { include: { opportunity: { select: { potentialRoleTitle: true, name: true, hiringOrganization: { select: { name: true } } } } } },
  mandates: { include: { mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } } },
  candidateProcesses: true,
  intelligenceItems: true,
  people: { include: { person: true } },
} as const;

/** Round 2 section 4 "What's next?" popup — what it needs about the task just completed, pre-filling the next step. */
export type CompletedTaskSummary = {
  id: string;
  title: string;
  type: string;
  personId: string | null;
  personName: string | null;
  opportunityId: string | null;
  mandateId: string | null;
  candidateProcessId: string | null;
  intelligenceItemId: string | null;
  assignedUserId: string;
  /** "Org · Role" from the linked opportunity/mandate, for the next-step dialog's subtitle (screen 21). */
  recordLabel: string | null;
};

function completedTaskSummary(task: {
  id: string;
  title: string;
  type: string;
  assignedUserId: string;
  opportunities: { opportunityId: string; opportunity: { potentialRoleTitle: string | null; name: string; hiringOrganization: { name: string } } }[];
  mandates: { mandateId: string; mandate: { title: string; hiringOrganization: { name: string } } }[];
  candidateProcesses: { candidateProcessId: string }[];
  intelligenceItems: { intelligenceItemId: string }[];
  people: { personId: string; person: { firstName: string; lastName: string } }[];
}): CompletedTaskSummary {
  const opp = task.opportunities[0]?.opportunity;
  const mandate = task.mandates[0]?.mandate;
  const recordLabel = mandate
    ? `${mandate.hiringOrganization.name} · ${mandate.title}`
    : opp
      ? `${opp.hiringOrganization.name} · ${opp.potentialRoleTitle ?? opp.name}`
      : null;

  return {
    id: task.id,
    title: task.title,
    type: task.type,
    personId: task.people[0]?.personId ?? null,
    personName: task.people[0] ? `${task.people[0].person.firstName} ${task.people[0].person.lastName}` : null,
    opportunityId: task.opportunities[0]?.opportunityId ?? null,
    mandateId: task.mandates[0]?.mandateId ?? null,
    candidateProcessId: task.candidateProcesses[0]?.candidateProcessId ?? null,
    intelligenceItemId: task.intelligenceItems[0]?.intelligenceItemId ?? null,
    assignedUserId: task.assignedUserId,
    recordLabel,
  };
}

export async function completeTaskAction(taskId: string, completionNote?: string): Promise<CompletedTaskSummary> {
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
  return completedTaskSummary(task);
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

/** Round 2 section 4 "What's next?" popup — a call's optional outcome and one-line note, logged as an Activity against the same links as the task just completed. */
export async function logCompletedCallOutcomeAction(input: {
  outcome?: "CONNECTED" | "VOICEMAIL" | "NO_ANSWER";
  note?: string;
  personId: string | null;
  assignedUserId: string;
  opportunityId: string | null;
  mandateId: string | null;
  candidateProcessId: string | null;
  intelligenceItemId: string | null;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  if (!input.outcome && !input.note) return;

  await prisma.activity.create({
    data: {
      workspaceId: user.workspaceId,
      type: "CALL",
      direction: "OUTBOUND",
      outcome: input.outcome ?? null,
      occurredAt: new Date(),
      summary: input.note || null,
      createdById: user.id,
      assignedOwnerId: input.assignedUserId,
      people: input.personId ? { create: [{ personId: input.personId }] } : undefined,
      opportunities: input.opportunityId ? { create: [{ opportunityId: input.opportunityId }] } : undefined,
      mandates: input.mandateId ? { create: [{ mandateId: input.mandateId }] } : undefined,
      candidateProcesses: input.candidateProcessId ? { create: [{ candidateProcessId: input.candidateProcessId }] } : undefined,
      intelligenceItems: input.intelligenceItemId ? { create: [{ intelligenceItemId: input.intelligenceItemId }] } : undefined,
    },
  });

  if (input.opportunityId) revalidatePath(`/opportunities/${input.opportunityId}`);
  if (input.mandateId) revalidatePath(`/mandates/${input.mandateId}`);
}

/** Round 2 section 4 "What's next?" popup — "Save next step": same type and person as the task just done, due on the picked quick date. */
export async function createNextStepTaskAction(input: {
  title: string;
  type: string;
  dueDate: string;
  personId: string | null;
  assignedUserId: string;
  opportunityId: string | null;
  mandateId: string | null;
  candidateProcessId: string | null;
  intelligenceItemId: string | null;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const relatedRecordType = input.mandateId
    ? "MANDATE"
    : input.opportunityId
      ? "OPPORTUNITY"
      : input.candidateProcessId
        ? "CANDIDATE_PROCESS"
        : input.intelligenceItemId
          ? "INTELLIGENCE_ITEM"
          : undefined;
  const relatedRecordId = input.mandateId ?? input.opportunityId ?? input.candidateProcessId ?? input.intelligenceItemId ?? undefined;

  const task = await prisma.task.create({
    data: {
      workspaceId: user.workspaceId,
      title: input.title,
      type: input.type as Parameters<typeof prisma.task.create>[0]["data"]["type"],
      status: "TODO",
      priority: "NORMAL",
      assignedUserId: input.assignedUserId,
      createdById: user.id,
      dueDate: new Date(input.dueDate),
      relatedRecordType: relatedRecordType as Parameters<typeof prisma.task.create>[0]["data"]["relatedRecordType"],
      relatedRecordId,
      people: input.personId ? { create: [{ personId: input.personId }] } : undefined,
      opportunities: input.opportunityId ? { create: [{ opportunityId: input.opportunityId }] } : undefined,
      mandates: input.mandateId ? { create: [{ mandateId: input.mandateId }] } : undefined,
      candidateProcesses: input.candidateProcessId ? { create: [{ candidateProcessId: input.candidateProcessId }] } : undefined,
      intelligenceItems: input.intelligenceItemId ? { create: [{ intelligenceItemId: input.intelligenceItemId }] } : undefined,
    },
  });

  await prisma.inAppNotification.create({
    data: { userId: input.assignedUserId, type: "TASK_ASSIGNED", title: `New task: ${task.title}`, relatedTaskId: task.id },
  });
  await syncPrimaryNextTask(input);
  revalidatePath("/tasks");
  if (input.opportunityId) revalidatePath(`/opportunities/${input.opportunityId}`);
  if (input.mandateId) revalidatePath(`/mandates/${input.mandateId}`);
}
