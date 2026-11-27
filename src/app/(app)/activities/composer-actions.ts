"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { syncPrimaryNextTask } from "@/lib/next-task";
import * as graph from "@/lib/graph-client";
import * as gmail from "@/lib/gmail-client";
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

/**
 * Round 2 section 7 "the composer's Email tab sends through the user's own
 * mailbox, so it lands in their Sent folder." Falls back to logging only
 * (the pre-section-7 behaviour) when the assigned user has no connected,
 * enabled mailbox, or the send itself fails — the Activity is always
 * created either way, just without a real send behind it.
 */
async function trySendComposerEmail(assignedUserId: string, personId: string | null | undefined, subject: string, body: string): Promise<string | null> {
  if (!personId || !body) return null;
  const [connection, person] = await Promise.all([
    prisma.mailboxConnection.findFirst({ where: { userId: assignedUserId, emailSyncEnabled: true, status: "ACTIVE" } }),
    prisma.person.findUnique({ where: { id: personId }, select: { primaryEmail: true } }),
  ]);
  if (!connection || !person?.primaryEmail) return null;

  try {
    const messageId =
      connection.provider === "MICROSOFT"
        ? await graph.sendMail(connection, { to: person.primaryEmail, subject, body })
        : await gmail.sendMail(connection, { to: person.primaryEmail, subject, body });
    return messageId || null;
  } catch {
    return null;
  }
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
    const externalMessageId = activityType === "EMAIL" ? await trySendComposerEmail(input.assignedUserId, input.personId, input.subject, input.notes ?? "") : null;
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
        externalMessageId: externalMessageId ?? undefined,
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

/** Round 2 section 7 "Private flag per email" — only the email's owner or creator can toggle it. */
export async function toggleActivityPrivateAction(activityId: string) {
  const user = await requireUser();
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: {
      type: true,
      private: true,
      assignedOwnerId: true,
      createdById: true,
      people: { select: { personId: true } },
      organizations: { select: { organizationId: true } },
      opportunities: { select: { opportunityId: true } },
      mandates: { select: { mandateId: true } },
    },
  });
  if (activity.type !== "EMAIL") throw new Error("Only emails can be marked private.");
  if (activity.assignedOwnerId !== user.id && activity.createdById !== user.id) throw new PermissionError();

  await prisma.activity.update({ where: { id: activityId }, data: { private: !activity.private } });
  activity.people.forEach((p) => revalidatePath(`/people/${p.personId}`));
  activity.organizations.forEach((o) => revalidatePath(`/organisations/${o.organizationId}`));
  activity.opportunities.forEach((o) => revalidatePath(`/opportunities/${o.opportunityId}`));
  activity.mandates.forEach((m) => revalidatePath(`/mandates/${m.mandateId}`));
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
