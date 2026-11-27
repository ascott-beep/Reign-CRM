"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { syncPrimaryNextTask } from "@/lib/next-task";
import type { ActivityType, ActivityOutcome, TaskType, RelatedRecordType } from "@prisma/client";

export type ComposerLinkContext = {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  candidateProcessId?: string;
  intelligenceItemId?: string;
};

export type ComposerKind = "CALL" | "MEETING" | "TASK" | "EMAIL" | "DEADLINE";

/** Round 2 section 4 composer: Call/Meeting/Email can be logged as already done (an Activity) or left scheduled (a Task); Task/Deadline are always scheduled. */
const ACTIVITY_TYPE_FOR: Partial<Record<ComposerKind, ActivityType>> = { CALL: "CALL", MEETING: "MEETING", EMAIL: "EMAIL" };
const TASK_TYPE_FOR: Record<ComposerKind, TaskType> = { CALL: "CALL", MEETING: "MEETING", EMAIL: "EMAIL", TASK: "OTHER", DEADLINE: "OTHER" };

function linkInclude(link: ComposerLinkContext, personId?: string | null) {
  return {
    organizations: link.organizationId ? { create: [{ organizationId: link.organizationId }] } : undefined,
    people: personId ? { create: [{ personId }] } : undefined,
    opportunities: link.opportunityId ? { create: [{ opportunityId: link.opportunityId }] } : undefined,
    mandates: link.mandateId ? { create: [{ mandateId: link.mandateId }] } : undefined,
    candidateProcesses: link.candidateProcessId ? { create: [{ candidateProcessId: link.candidateProcessId }] } : undefined,
    intelligenceItems: link.intelligenceItemId ? { create: [{ intelligenceItemId: link.intelligenceItemId }] } : undefined,
  };
}

function relatedRecord(link: ComposerLinkContext): { relatedRecordType?: RelatedRecordType; relatedRecordId?: string } {
  if (link.mandateId) return { relatedRecordType: "MANDATE", relatedRecordId: link.mandateId };
  if (link.opportunityId) return { relatedRecordType: "OPPORTUNITY", relatedRecordId: link.opportunityId };
  if (link.organizationId) return { relatedRecordType: "ORGANIZATION", relatedRecordId: link.organizationId };
  if (link.personId) return { relatedRecordType: "PERSON", relatedRecordId: link.personId };
  if (link.candidateProcessId) return { relatedRecordType: "CANDIDATE_PROCESS", relatedRecordId: link.candidateProcessId };
  return {};
}

function revalidateLinked(link: ComposerLinkContext) {
  revalidatePath("/tasks");
  if (link.opportunityId) revalidatePath(`/opportunities/${link.opportunityId}`);
  if (link.mandateId) revalidatePath(`/mandates/${link.mandateId}`);
  if (link.personId) revalidatePath(`/people/${link.personId}`);
  if (link.organizationId) revalidatePath(`/organisations/${link.organizationId}`);
}

export async function submitComposerAction(input: {
  kind: ComposerKind;
  markAsDone: boolean;
  subject: string;
  when: string;
  durationMinutes?: number;
  outcome?: ActivityOutcome;
  notes?: string;
  personId?: string | null;
  assignedUserId: string;
  link: ComposerLinkContext;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const activityType = ACTIVITY_TYPE_FOR[input.kind];
  if (input.markAsDone && activityType) {
    await prisma.activity.create({
      data: {
        workspaceId: user.workspaceId,
        type: activityType,
        direction: "OUTBOUND",
        outcome: input.outcome ?? null,
        subject: input.subject,
        occurredAt: new Date(input.when),
        durationMinutes: input.durationMinutes ?? null,
        summary: input.notes ?? null,
        createdById: user.id,
        assignedOwnerId: input.assignedUserId,
        ...linkInclude(input.link, input.personId),
      },
    });
  } else {
    await prisma.task.create({
      data: {
        workspaceId: user.workspaceId,
        title: input.subject,
        type: TASK_TYPE_FOR[input.kind],
        status: "TODO",
        priority: "NORMAL",
        assignedUserId: input.assignedUserId,
        createdById: user.id,
        dueDate: new Date(input.when),
        description: input.notes || null,
        ...relatedRecord(input.link),
        ...linkInclude(input.link, input.personId),
      },
    });
    await syncPrimaryNextTask(input.link);
  }

  revalidateLinked(input.link);
}

export async function submitComposerNoteAction(input: { notes: string; assignedUserId: string; link: ComposerLinkContext }) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  await prisma.activity.create({
    data: {
      workspaceId: user.workspaceId,
      type: "NOTE",
      direction: "NOT_APPLICABLE",
      occurredAt: new Date(),
      summary: input.notes,
      fullNotes: input.notes,
      createdById: user.id,
      assignedOwnerId: input.assignedUserId,
      ...linkInclude(input.link, input.link.personId),
    },
  });

  revalidateLinked(input.link);
}
