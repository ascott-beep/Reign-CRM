"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { intelligenceFormSchema } from "@/lib/validation/intelligence";
import { writeAuditLog } from "@/lib/audit";
import { startOfTodayInLondon } from "@/lib/datetime";
import { PRACTICES, areaNameForPractice, roleGroupsForPractice, type Practice } from "@/lib/practices";
import { OPEN_OPPORTUNITY_STAGES } from "@/lib/rules";
import type { IntelligenceDismissReason, OpportunityStage, Prisma } from "@prisma/client";

/** Mirrors opportunities/actions.ts's own helper -- the dialog submits a practice KEY, not a PracticeArea row id. */
async function practiceAreaIdForPracticeKey(workspaceId: string, practiceKey: string | undefined): Promise<string | null> {
  if (!practiceKey || !(PRACTICES as readonly string[]).includes(practiceKey)) return null;
  const row = await prisma.practiceArea.findFirst({ where: { workspaceId, name: areaNameForPractice(practiceKey as Practice) }, select: { id: true } });
  return row?.id ?? null;
}

/** A role title found in the signal's text, matched back to one of the four practices (not Other or a custom title). */
function practiceForRoleTitle(title: string | undefined): Practice | undefined {
  if (!title) return undefined;
  for (const practice of PRACTICES) {
    for (const group of roleGroupsForPractice(practice)) {
      if (group.titles.some((t) => t.toLowerCase() === title.toLowerCase())) return practice;
    }
  }
  return undefined;
}

export type OpportunityDraftFromSignal = {
  clientOrganizationId: string;
  clientOrganizationName: string;
  clientFromSignal: boolean;
  portfolioCompanyId: string | null;
  portfolioCompanyName: string | null;
  portfolioCompanyFromSignal: boolean;
  practiceKey: Practice | null;
  practiceFromSignal: boolean;
  role: string;
  roleFromSignal: boolean;
  clientContactId: string | null;
  clientContactName: string | null;
  clientContactRole: string | null;
  clientContactFromSignal: boolean;
  clientContactOptions: { id: string; name: string; role: string | null }[];
  stage: string;
  estimatedFeeAmount: string;
  estimatedFeeCurrency: string;
  nextStep: string;
  nextStepFromSignal: boolean;
};

/**
 * Round 5 screen 11 "Create opportunity" dialog's starting values. No AI key
 * is required for this: everything here comes from the signal's own
 * structured fields (its organisation, any "Likely role:" line already
 * written into details by the research agent) and simple relation lookups
 * already in the data model (which fund owns this portfolio company, which
 * client contact covers it) -- not free-text extraction, which would need a
 * real AI call this environment has no key for. Fields with nothing to go
 * on (estimated fee, specifically) are left blank rather than guessed.
 */
export async function getOpportunityDraftFromSignalAction(itemId: string): Promise<OpportunityDraftFromSignal> {
  const user = await requireUser();
  const item = await prisma.intelligenceItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { organizationId: true, organization: { select: { id: true, name: true, type: true } }, details: true },
  });

  const likelyRole = item.details?.match(/^Likely role:\s*(.+)$/m)?.[1]?.trim();
  const practice = practiceForRoleTitle(likelyRole);

  let clientOrganizationId = item.organization.id;
  let clientOrganizationName = item.organization.name;
  let portfolioCompanyId: string | null = null;
  let portfolioCompanyName: string | null = null;

  if (item.organization.type === "PORTFOLIO_COMPANY") {
    const ownership = await prisma.organizationRelationship.findFirst({
      where: { targetOrganizationId: item.organization.id, type: "CURRENT_INVESTOR_IN", investmentStatus: { in: ["CURRENT", "ANNOUNCED"] } },
      orderBy: { investmentDate: "desc" },
      select: { sourceOrganization: { select: { id: true, name: true } } },
    });
    if (ownership) {
      clientOrganizationId = ownership.sourceOrganization.id;
      clientOrganizationName = ownership.sourceOrganization.name;
      portfolioCompanyId = item.organization.id;
      portfolioCompanyName = item.organization.name;
    }
  }

  const clientContacts = await prisma.person.findMany({
    where: { workspaceId: user.workspaceId, archivedAt: null, clientContactProfile: { coveredPortfolioCompanies: { some: { organizationId: clientOrganizationId } } } },
    select: { id: true, firstName: true, lastName: true, clientContactProfile: { select: { roleAtFirm: true } } },
    take: 10,
  });
  const clientContact = clientContacts[0] ?? null;

  return {
    clientOrganizationId,
    clientOrganizationName,
    clientFromSignal: true,
    portfolioCompanyId,
    portfolioCompanyName,
    portfolioCompanyFromSignal: portfolioCompanyId !== null,
    practiceKey: practice ?? null,
    practiceFromSignal: practice !== undefined,
    role: likelyRole ?? "",
    roleFromSignal: Boolean(likelyRole),
    clientContactId: clientContact?.id ?? null,
    clientContactName: clientContact ? `${clientContact.firstName} ${clientContact.lastName}` : null,
    clientContactRole: clientContact?.clientContactProfile?.roleAtFirm ?? null,
    clientContactFromSignal: clientContact !== null,
    clientContactOptions: clientContacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, role: c.clientContactProfile?.roleAtFirm ?? null })),
    stage: "SIGNAL_IDENTIFIED",
    estimatedFeeAmount: "",
    estimatedFeeCurrency: "GBP",
    nextStep: "Reach out to confirm interest",
    nextStepFromSignal: true,
  };
}

export type CreateOpportunityFromSignalInput = {
  hiringOrganizationId: string;
  portfolioCompanyId: string | null;
  practiceKey: string | null;
  potentialRoleTitle: string;
  leadContactPersonId: string | null;
  stage: OpportunityStage;
  estimatedFeeAmount: number | null;
  estimatedFeeCurrency: string | null;
  nextStepSummary: string;
};

async function fileSignalOnOpportunityActivity(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  opportunityId: string,
  item: { id: string; title: string; sourceUrl: string | null },
  userId: string,
) {
  return tx.activity.create({
    data: {
      workspaceId,
      type: "SYSTEM_EVENT",
      summary: item.title,
      fullNotes: item.sourceUrl ? `Filed from an Intelligence signal. Source: ${item.sourceUrl}` : "Filed from an Intelligence signal.",
      createdById: userId,
      assignedOwnerId: userId,
      opportunities: { create: [{ opportunityId }] },
      intelligenceItems: { create: [{ intelligenceItemId: item.id }] },
    },
  });
}

/** Round 5 screen 11 "Create opportunity" -- the dialog's confirm action, distinct from the older one-click convertIntelligenceToOpportunityAction above. */
export async function createOpportunityFromSignalAction(itemId: string, input: CreateOpportunityFromSignalInput) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.findUniqueOrThrow({ where: { id: itemId }, select: { id: true, title: true, sourceUrl: true, sourcePersonId: true, ownerId: true, convertedOpportunityId: true } });
  if (item.convertedOpportunityId) redirect(`/opportunities/${item.convertedOpportunityId}`);

  const practiceAreaId = await practiceAreaIdForPracticeKey(user.workspaceId, input.practiceKey ?? undefined);
  const namedOrganization = await prisma.organization.findUniqueOrThrow({
    where: { id: input.portfolioCompanyId ?? input.hiringOrganizationId },
    select: { name: true },
  });
  const name = input.potentialRoleTitle ? `${namedOrganization.name} · ${input.potentialRoleTitle}` : namedOrganization.name;

  const opportunity = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunity.create({
      data: {
        workspaceId: user.workspaceId,
        name,
        hiringOrganizationId: input.hiringOrganizationId,
        portfolioCompanyId: input.portfolioCompanyId,
        practiceAreaId,
        type: "UNKNOWN",
        potentialRoleTitle: input.potentialRoleTitle || null,
        stage: input.stage,
        stageProbabilityDefault: 5,
        source: "CANDIDATE_INTELLIGENCE",
        sourcePersonId: item.sourcePersonId,
        leadContactPersonId: input.leadContactPersonId,
        ownerId: item.ownerId,
        estimatedFeeAmount: input.estimatedFeeAmount,
        estimatedFeeCurrency: input.estimatedFeeCurrency,
        nextStepSummary: input.nextStepSummary || null,
        createdById: user.id,
        stageHistory: { create: [{ toStage: input.stage, changedById: user.id, notes: `Converted from intelligence item "${item.title}".` }] },
      },
    });

    await tx.intelligenceItem.update({ where: { id: item.id }, data: { convertedOpportunityId: created.id, reviewState: "ACCEPTED" } });
    await fileSignalOnOpportunityActivity(tx, user.workspaceId, created.id, item, user.id);

    await tx.auditLog.create({ data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: item.id, action: "CONVERSION", changedFields: { convertedToOpportunityId: created.id } } });
    await tx.auditLog.create({ data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Opportunity", entityId: created.id, action: "CONVERSION", changedFields: { sourceIntelligenceItemId: item.id } } });

    return created;
  });

  revalidatePath(`/intelligence/${itemId}`);
  revalidatePath("/intelligence");
  revalidatePath("/opportunities");
  revalidatePath("/");
  redirect(`/opportunities/${opportunity.id}`);
}

export type OpenOpportunityOption = { id: string; name: string; stage: string };

/** Round 5 screen 11 "Add to existing opportunity" menu item -- open opportunities for the signal's own client organisation. */
export async function searchOpenOpportunitiesForOrganizationAction(organizationId: string, query: string): Promise<OpenOpportunityOption[]> {
  const user = await requireUser();
  const rows = await prisma.opportunity.findMany({
    where: {
      workspaceId: user.workspaceId,
      archivedAt: null,
      stage: { in: OPEN_OPPORTUNITY_STAGES },
      OR: [{ hiringOrganizationId: organizationId }, { portfolioCompanyId: organizationId }],
      name: query.trim() ? { contains: query.trim(), mode: "insensitive" } : undefined,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, name: true, stage: true },
  });
  return rows;
}

/** Round 5 screen 11 "Add to existing opportunity" confirm -- links the signal without creating a new opportunity. */
export async function linkIntelligenceToExistingOpportunityAction(itemId: string, opportunityId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const item = await prisma.intelligenceItem.findUniqueOrThrow({ where: { id: itemId }, select: { id: true, title: true, sourceUrl: true, convertedOpportunityId: true } });
  if (item.convertedOpportunityId) redirect(`/opportunities/${item.convertedOpportunityId}`);

  await prisma.$transaction(async (tx) => {
    await tx.intelligenceItem.update({ where: { id: item.id }, data: { convertedOpportunityId: opportunityId, reviewState: "ACCEPTED" } });
    await fileSignalOnOpportunityActivity(tx, user.workspaceId, opportunityId, item, user.id);
    await tx.auditLog.create({ data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "IntelligenceItem", entityId: item.id, action: "CONVERSION", changedFields: { convertedToOpportunityId: opportunityId } } });
  });

  revalidatePath(`/intelligence/${itemId}`);
  revalidatePath("/intelligence");
  revalidatePath(`/opportunities/${opportunityId}`);
  redirect(`/opportunities/${opportunityId}`);
}

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
