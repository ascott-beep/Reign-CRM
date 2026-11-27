"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { intelligenceFormSchema } from "@/lib/validation/intelligence";
import { writeAuditLog } from "@/lib/audit";
import { startOfTodayInLondon } from "@/lib/datetime";
import type { IntelligenceDismissReason } from "@prisma/client";

export type IntelligenceFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

export async function createIntelligenceAction(_prev: IntelligenceFormState, formData: FormData): Promise<IntelligenceFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = intelligenceFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;

  const item = await prisma.intelligenceItem.create({
    data: {
      workspaceId: user.workspaceId,
      title: data.title,
      organizationId: data.organizationId,
      type: data.type,
      details: data.details ?? null,
      sourcePersonId: data.sourcePersonId ?? null,
      sourceUrl: data.sourceUrl ?? null,
      dateReceived: data.dateReceived,
      confidence: data.confidence,
      commercialRelevance: data.commercialRelevance,
      confidentiality: data.confidentiality,
      ownerId: data.ownerId,
      followUpRequired: data.followUpRequired ?? false,
      createdById: user.id,
    },
  });

  if (item.commercialRelevance === "HIGH" || item.commercialRelevance === "IMMEDIATE") {
    await prisma.inAppNotification.create({
      data: { userId: item.ownerId, type: "INTELLIGENCE_HIGH_PRIORITY", title: `High-relevance intelligence: ${item.title}`, relatedEntityType: "IntelligenceItem", relatedEntityId: item.id },
    });
  }

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: item.id, action: "CREATE" });

  revalidatePath("/intelligence");
  redirect(`/intelligence/${item.id}`);
}

export async function verifyIntelligenceAction(itemId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  await prisma.intelligenceItem.update({ where: { id: itemId }, data: { confidence: "VERIFIED", verifiedById: user.id, verifiedAt: new Date() } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: itemId, action: "UPDATE", changedFields: { confidence: "VERIFIED" } });
  revalidatePath(`/intelligence/${itemId}`);
}

/**
 * Intelligence -> Opportunity conversion (spec 8.3): preserves source
 * person/activity/organisation, prevents duplicate conversion via the
 * unique convertedOpportunityId, transactional and idempotent.
 *
 * Round 2 section 5 review queue's "Accept & create opportunity" reuses
 * this same action: it also accepts the item, and names the opportunity
 * "<likely role> · <company>" (e.g. "CFO · Pinnacle Energy") when the
 * agent found a likely role in `details`, falling back to the item's
 * title for hand-logged items (which never carry a "Likely role:" line).
 */
export async function convertIntelligenceToOpportunityAction(itemId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.findUniqueOrThrow({ where: { id: itemId }, include: { organization: { select: { name: true } } } });
  if (item.convertedOpportunityId) {
    redirect(`/opportunities/${item.convertedOpportunityId}`);
  }

  const likelyRole = item.details?.match(/^Likely role:\s*(.+)$/m)?.[1]?.trim();

  const opportunity = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunity.create({
      data: {
        workspaceId: user.workspaceId,
        name: likelyRole ? `${likelyRole} · ${item.organization.name}` : item.title,
        hiringOrganizationId: item.organizationId,
        type: "UNKNOWN",
        potentialRoleTitle: likelyRole ?? null,
        stage: "SIGNAL_IDENTIFIED",
        stageProbabilityDefault: 5,
        source: "CANDIDATE_INTELLIGENCE",
        sourcePersonId: item.sourcePersonId,
        ownerId: item.ownerId,
        notes: item.details,
        createdById: user.id,
        stageHistory: { create: [{ toStage: "SIGNAL_IDENTIFIED", changedById: user.id, notes: `Converted from intelligence item "${item.title}".` }] },
      },
    });

    await tx.intelligenceItem.update({ where: { id: item.id }, data: { convertedOpportunityId: created.id, reviewState: "ACCEPTED" } });

    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: item.id, action: "CONVERSION", changedFields: { convertedToOpportunityId: created.id } },
    });
    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Opportunity", entityId: created.id, action: "CONVERSION", changedFields: { sourceIntelligenceItemId: item.id } },
    });

    return created;
  });

  revalidatePath(`/intelligence/${itemId}`);
  revalidatePath("/intelligence");
  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect(`/opportunities/${opportunity.id}`);
}

/** Round 2 section 5 review queue "Accept": files the signal against the company (and any person mentioned) without creating anything else. */
export async function acceptIntelligenceItemAction(itemId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.update({
    where: { id: itemId },
    data: { reviewState: "ACCEPTED", dismissReason: null, dismissedAt: null },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: itemId, action: "UPDATE", changedFields: { reviewState: "ACCEPTED" } });

  revalidatePath("/intelligence");
  revalidatePath("/");
  revalidatePath(`/organisations/${item.organizationId}`);
}

/**
 * Round 4 screen 30 -- the "Accept and add reminder" suggestion for a signal
 * with no direct record to act on (e.g. a new-fund announcement): files the
 * signal and creates a 30-day follow-up task, same shape as the opportunity
 * "Check back in" task.
 */
export async function acceptAndRemindIntelligenceItemAction(itemId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.findUniqueOrThrow({ where: { id: itemId }, include: { organization: { select: { name: true } } } });

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        workspaceId: user.workspaceId,
        title: `Follow up · ${item.organization.name}`,
        type: "FOLLOW_UP",
        status: "TODO",
        priority: "NORMAL",
        assignedUserId: item.ownerId,
        createdById: user.id,
        dueDate: new Date(startOfTodayInLondon().getTime() + 30 * 24 * 60 * 60 * 1000),
        relatedRecordType: "INTELLIGENCE_ITEM",
        relatedRecordId: item.id,
        intelligenceItems: { create: [{ intelligenceItemId: item.id }] },
      },
    });
    await tx.intelligenceItem.update({ where: { id: item.id }, data: { reviewState: "ACCEPTED", primaryNextTaskId: task.id, dismissReason: null, dismissedAt: null } });
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: itemId, action: "UPDATE", changedFields: { reviewState: "ACCEPTED" } });

  revalidatePath("/intelligence");
  revalidatePath("/");
  revalidatePath(`/organisations/${item.organizationId}`);
}

/**
 * Round 2 section 5 review queue "Dismiss with a reason". Dismissed items
 * stay visible under the queue's "Dismissed" filter for 30 days (filtered
 * at read time in review-queue.tsx, no extra cron) and the reason feeds
 * back into the next sweep's prompt via dismissContextFor() in
 * lib/intelligence-sweep.ts so the agent learns what to skip.
 */
export async function dismissIntelligenceItemAction(itemId: string, reason: IntelligenceDismissReason) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  await prisma.intelligenceItem.update({
    where: { id: itemId },
    data: { reviewState: "DISMISSED", dismissReason: reason, dismissedAt: new Date() },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: itemId, action: "UPDATE", changedFields: { reviewState: "DISMISSED", dismissReason: reason } });

  revalidatePath("/intelligence");
}
