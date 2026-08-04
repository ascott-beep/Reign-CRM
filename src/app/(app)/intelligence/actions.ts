"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { intelligenceFormSchema } from "@/lib/validation/intelligence";
import { writeAuditLog } from "@/lib/audit";

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
 */
export async function convertIntelligenceToOpportunityAction(itemId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.findUniqueOrThrow({ where: { id: itemId } });
  if (item.convertedOpportunityId) {
    redirect(`/opportunities/${item.convertedOpportunityId}`);
  }

  const opportunity = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunity.create({
      data: {
        workspaceId: user.workspaceId,
        name: item.title,
        hiringOrganizationId: item.organizationId,
        type: "UNKNOWN",
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

    await tx.intelligenceItem.update({ where: { id: item.id }, data: { convertedOpportunityId: created.id } });

    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: item.id, action: "CONVERSION", changedFields: { convertedToOpportunityId: created.id } },
    });
    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Opportunity", entityId: created.id, action: "CONVERSION", changedFields: { sourceIntelligenceItemId: item.id } },
    });

    return created;
  });

  revalidatePath(`/intelligence/${itemId}`);
  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}
