"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { opportunityFormSchema, stageChangeSchema, defaultProbabilityFor } from "@/lib/validation/opportunity";
import { writeAuditLog, diffFields } from "@/lib/audit";
import { generateMandateReference } from "@/lib/mandate-reference";

export type OpportunityFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

async function getWorkspaceStageProbabilities(workspaceId: string): Promise<Record<string, number> | null> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { opportunityStageProbabilities: true } });
  return (workspace?.opportunityStageProbabilities as Record<string, number> | null) ?? null;
}

export async function createOpportunityAction(_prev: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = opportunityFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;
  const overrides = await getWorkspaceStageProbabilities(user.workspaceId);

  const opportunity = await prisma.opportunity.create({
    data: {
      workspaceId: user.workspaceId,
      name: data.name,
      hiringOrganizationId: data.hiringOrganizationId,
      type: data.type,
      stage: "SIGNAL_IDENTIFIED",
      stageProbabilityDefault: defaultProbabilityFor("SIGNAL_IDENTIFIED", overrides),
      potentialRoleTitle: data.potentialRoleTitle ?? null,
      employmentType: data.employmentType ?? null,
      source: data.source,
      leadContactPersonId: data.leadContactPersonId ?? null,
      ownerId: data.ownerId,
      estimatedFeeAmount: data.estimatedFeeAmount ?? null,
      estimatedFeeCurrency: data.estimatedFeeCurrency ?? null,
      expectedDecisionDate: data.expectedDecisionDate ?? null,
      nextStepSummary: data.nextStepSummary ?? null,
      notes: data.notes ?? null,
      createdById: user.id,
      stageHistory: { create: [{ toStage: "SIGNAL_IDENTIFIED", changedById: user.id, notes: "Opportunity created." }] },
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Opportunity", entityId: opportunity.id, action: "CREATE" });

  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}

export async function updateOpportunityAction(opportunityId: string, _prev: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = opportunityFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;

  const before = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      name: data.name,
      hiringOrganizationId: data.hiringOrganizationId,
      type: data.type,
      potentialRoleTitle: data.potentialRoleTitle ?? null,
      employmentType: data.employmentType ?? null,
      source: data.source,
      leadContactPersonId: data.leadContactPersonId ?? null,
      ownerId: data.ownerId,
      estimatedFeeAmount: data.estimatedFeeAmount ?? null,
      estimatedFeeCurrency: data.estimatedFeeCurrency ?? null,
      expectedDecisionDate: data.expectedDecisionDate ?? null,
      nextStepSummary: data.nextStepSummary ?? null,
      notes: data.notes ?? null,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Opportunity",
    entityId: opportunityId,
    action: "UPDATE",
    changedFields: diffFields(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  redirect(`/opportunities/${opportunityId}`);
}

export async function changeOpportunityStageAction(input: {
  opportunityId: string;
  toStage: string;
  lossReason?: string;
  lossExplanation?: string;
  onHoldReason?: string;
  notes?: string;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const parsed = stageChangeSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  if (data.toStage === "LOST" && !data.lossReason) {
    throw new Error("A loss reason is required when moving an opportunity to Lost.");
  }

  const opportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id: data.opportunityId } });
  if (opportunity.stage === data.toStage) return;
  const overrides = await getWorkspaceStageProbabilities(user.workspaceId);

  await prisma.$transaction([
    prisma.opportunity.update({
      where: { id: data.opportunityId },
      data: {
        stage: data.toStage,
        stageEnteredAt: new Date(),
        stageProbabilityDefault: defaultProbabilityFor(data.toStage, overrides),
        isProbabilityOverridden: false,
        probabilityOverride: null,
        lossReason: data.toStage === "LOST" ? (data.lossReason as any) : null,
        lossExplanation: data.toStage === "LOST" ? (data.lossExplanation ?? null) : null,
        onHoldReason: data.toStage === "ON_HOLD" ? (data.onHoldReason ?? null) : null,
        closedAt: data.toStage === "WON" || data.toStage === "LOST" ? new Date() : null,
      },
    }),
    prisma.opportunityStageHistory.create({
      data: {
        opportunityId: data.opportunityId,
        fromStage: opportunity.stage,
        toStage: data.toStage,
        changedById: user.id,
        notes: data.notes ?? null,
      },
    }),
  ]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Opportunity",
    entityId: data.opportunityId,
    action: "STAGE_CHANGE",
    changedFields: { fromStage: opportunity.stage, toStage: data.toStage },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${data.opportunityId}`);
}

export async function setProbabilityOverrideAction(opportunityId: string, probability: number) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { probabilityOverride: probability, isProbabilityOverridden: true },
  });
  revalidatePath(`/opportunities/${opportunityId}`);
}

/**
 * Won opportunity -> Mandate conversion. Transactional, preserves a
 * two-way backlink, and is idempotent (guarded by Opportunity.wonMandateId
 * unique + Mandate.sourceOpportunityId unique).
 */
export async function convertOpportunityToMandateAction(opportunityId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const opportunity = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: { relatedFunds: true, functionalSpecialisms: true, stakeholders: true },
  });

  if (opportunity.stage !== "WON") throw new Error("Only a Won opportunity can be converted to a mandate.");
  if (opportunity.wonMandateId) {
    // Already converted — idempotent no-op, just route to the existing mandate.
    redirect(`/mandates/${opportunity.wonMandateId}`);
  }

  const reference = await generateMandateReference(user.workspaceId);

  const mandate = await prisma.$transaction(async (tx) => {
    const created = await tx.mandate.create({
      data: {
        workspaceId: user.workspaceId,
        reference,
        title: opportunity.potentialRoleTitle || opportunity.name,
        hiringOrganizationId: opportunity.hiringOrganizationId,
        sourceOpportunityId: opportunity.id,
        status: "BRIEF_RECEIVED",
        priority: "NORMAL",
        confidentiality: "OPEN",
        ownerId: opportunity.ownerId,
        practiceAreaId: opportunity.practiceAreaId,
        employmentType: opportunity.employmentType ?? "PERMANENT",
        hiringManagerPersonId: opportunity.leadContactPersonId,
        feeType: "PERCENTAGE_OF_BASE",
        engagementModel: opportunity.type === "RETAINED_SEARCH" ? "RETAINED" : opportunity.type === "INTERIM_ASSIGNMENT" ? "INTERIM" : "CONTINGENT",
        createdById: user.id,
        relatedFunds: { create: opportunity.relatedFunds.map((f) => ({ organizationId: f.organizationId })) },
        functionalSpecialisms: { create: opportunity.functionalSpecialisms.map((s) => ({ specialismId: s.specialismId })) },
        stakeholders: { create: opportunity.stakeholders.map((s) => ({ personId: s.personId, role: s.role })) },
      },
    });

    await tx.mandateStatusHistory.create({
      data: { mandateId: created.id, toStatus: "BRIEF_RECEIVED", changedById: user.id, notes: `Converted from opportunity "${opportunity.name}".` },
    });

    await tx.opportunity.update({ where: { id: opportunity.id }, data: { wonMandateId: created.id } });

    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Opportunity",
        entityId: opportunity.id,
        action: "CONVERSION",
        changedFields: { convertedToMandateId: created.id },
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Mandate",
        entityId: created.id,
        action: "CONVERSION",
        changedFields: { sourceOpportunityId: opportunity.id },
      },
    });

    return created;
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/mandates");
  redirect(`/mandates/${mandate.id}`);
}
