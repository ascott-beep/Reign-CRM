"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { activityFormSchema } from "@/lib/validation/activity";
import { writeAuditLog } from "@/lib/audit";

export type ActivityFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

function backLinkFor(data: {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  candidateProcessId?: string;
  intelligenceItemId?: string;
}) {
  if (data.organizationId) return `/organisations/${data.organizationId}`;
  if (data.personId) return `/people/${data.personId}`;
  if (data.opportunityId) return `/opportunities/${data.opportunityId}`;
  if (data.mandateId) return `/mandates/${data.mandateId}`;
  if (data.intelligenceItemId) return `/intelligence/${data.intelligenceItemId}`;
  return "/tasks";
}

export async function createActivityAction(_prev: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = activityFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  }
  const data = parsed.data;

  const hasLink = Boolean(
    data.organizationId || data.personId || data.opportunityId || data.mandateId || data.candidateProcessId || data.intelligenceItemId,
  );
  if (!hasLink && !data.isInternal) {
    return {
      errors: { subject: ["Link this activity to at least one record, or mark it as an internal-only update."] },
      formValues: raw,
    };
  }

  // Logging an activity with follow-up required must create the task before submission completes.
  if (data.followUpRequired && !data.followUpTitle) {
    return { errors: { followUpTitle: ["A follow-up title is required when follow-up is marked required."] }, formValues: raw };
  }

  const activity = await prisma.$transaction(async (tx) => {
    let followUpTaskId: string | undefined;
    if (data.followUpRequired && data.followUpTitle) {
      const task = await tx.task.create({
        data: {
          workspaceId: user.workspaceId,
          title: data.followUpTitle,
          type: "FOLLOW_UP",
          status: "TODO",
          priority: "NORMAL",
          assignedUserId: data.assignedOwnerId,
          createdById: user.id,
          dueDate: data.followUpDueDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          organizations: data.organizationId ? { create: [{ organizationId: data.organizationId }] } : undefined,
          people: data.personId ? { create: [{ personId: data.personId }] } : undefined,
          opportunities: data.opportunityId ? { create: [{ opportunityId: data.opportunityId }] } : undefined,
          mandates: data.mandateId ? { create: [{ mandateId: data.mandateId }] } : undefined,
          candidateProcesses: data.candidateProcessId ? { create: [{ candidateProcessId: data.candidateProcessId }] } : undefined,
          intelligenceItems: data.intelligenceItemId ? { create: [{ intelligenceItemId: data.intelligenceItemId }] } : undefined,
        },
      });
      followUpTaskId = task.id;
    }

    return tx.activity.create({
      data: {
        workspaceId: user.workspaceId,
        type: data.type,
        direction: data.direction,
        outcome: data.outcome ?? null,
        subject: data.subject ?? null,
        occurredAt: data.occurredAt,
        durationMinutes: data.durationMinutes ?? null,
        summary: data.summary ?? null,
        fullNotes: data.fullNotes ?? null,
        createdById: user.id,
        assignedOwnerId: data.assignedOwnerId,
        followUpRequired: data.followUpRequired ?? false,
        followUpTaskId,
        organizations: data.organizationId ? { create: [{ organizationId: data.organizationId }] } : undefined,
        people: data.personId ? { create: [{ personId: data.personId }] } : undefined,
        opportunities: data.opportunityId ? { create: [{ opportunityId: data.opportunityId }] } : undefined,
        mandates: data.mandateId ? { create: [{ mandateId: data.mandateId }] } : undefined,
        candidateProcesses: data.candidateProcessId ? { create: [{ candidateProcessId: data.candidateProcessId }] } : undefined,
        intelligenceItems: data.intelligenceItemId ? { create: [{ intelligenceItemId: data.intelligenceItemId }] } : undefined,
      },
    });
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Activity",
    entityId: activity.id,
    action: "CREATE",
    changedFields: { type: activity.type, subject: activity.subject },
  });

  revalidatePath("/tasks");
  redirect(backLinkFor(data));
}
