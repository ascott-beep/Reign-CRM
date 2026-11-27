"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, PermissionError } from "@/lib/permissions";
import { opportunityFormSchema, stageChangeSchema, createMandateFromOpportunitySchema, defaultProbabilityFor } from "@/lib/validation/opportunity";
import { writeAuditLog, diffFields } from "@/lib/audit";
import { generateMandateReference } from "@/lib/mandate-reference";

export type OpportunityFormState = { errors?: Record<string, string[]>; formValues?: Record<string, unknown> };

async function getWorkspaceStageProbabilities(workspaceId: string): Promise<Record<string, number> | null> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { opportunityStageProbabilities: true } });
  return (workspace?.opportunityStageProbabilities as Record<string, number> | null) ?? null;
}

/** Round 2 section 9 — the short create form doesn't ask for a name; derive one from role + company when it's left blank. */
async function resolveOpportunityName(name: string | undefined, hiringOrganizationId: string, potentialRoleTitle: string | undefined) {
  if (name) return name;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: hiringOrganizationId }, select: { name: true } });
  return potentialRoleTitle ? `${potentialRoleTitle} · ${org.name}` : org.name;
}

export async function createOpportunityAction(_prev: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = opportunityFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  const data = parsed.data;
  const overrides = await getWorkspaceStageProbabilities(user.workspaceId);
  const name = await resolveOpportunityName(data.name, data.hiringOrganizationId, data.potentialRoleTitle);

  const opportunity = await prisma.opportunity.create({
    data: {
      workspaceId: user.workspaceId,
      name,
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
  const name = await resolveOpportunityName(data.name, data.hiringOrganizationId, data.potentialRoleTitle);
  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      name,
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
  revisitDate?: Date | string;
  onHoldReason?: string;
  holdReviewDate?: Date | string;
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

  await prisma.$transaction(async (tx) => {
    await tx.opportunity.update({
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
        holdReviewDate: data.toStage === "ON_HOLD" ? (data.holdReviewDate ?? null) : null,
        closedAt: data.toStage === "WON" || data.toStage === "LOST" ? new Date() : null,
      },
    });
    await tx.opportunityStageHistory.create({
      data: {
        opportunityId: data.opportunityId,
        fromStage: opportunity.stage,
        toStage: data.toStage,
        changedById: user.id,
        notes: data.notes ?? null,
      },
    });

    // d05: an optional revisit date creates a follow-up task, not stored on the opportunity itself.
    if (data.toStage === "LOST" && data.revisitDate) {
      await tx.task.create({
        data: {
          workspaceId: user.workspaceId,
          title: `Check back in — ${opportunity.name}`,
          type: "FOLLOW_UP",
          status: "TODO",
          priority: "NORMAL",
          assignedUserId: opportunity.ownerId,
          createdById: user.id,
          dueDate: data.revisitDate,
          relatedRecordType: "OPPORTUNITY",
          relatedRecordId: opportunity.id,
          opportunities: { create: [{ opportunityId: opportunity.id }] },
        },
      });
    }

    // d06: the review date creates a task for the opportunity owner.
    if (data.toStage === "ON_HOLD" && data.holdReviewDate) {
      await tx.task.create({
        data: {
          workspaceId: user.workspaceId,
          title: `Review on-hold opportunity — ${opportunity.name}`,
          type: "FOLLOW_UP",
          status: "TODO",
          priority: "NORMAL",
          assignedUserId: opportunity.ownerId,
          createdById: user.id,
          dueDate: data.holdReviewDate,
          relatedRecordType: "OPPORTUNITY",
          relatedRecordId: opportunity.id,
          opportunities: { create: [{ opportunityId: opportunity.id }] },
        },
      });
    }
  });

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
 * unique + Mandate.sourceOpportunityId unique). d01's dialog submits a
 * FormData with the reviewed/edited fields; a bare opportunityId falls back
 * to sensible defaults from the opportunity itself.
 */
export async function convertOpportunityToMandateAction(opportunityId: string, formData?: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = formData ? Object.fromEntries(formData.entries()) : {};
  const parsed = createMandateFromOpportunitySchema.partial().safeParse(raw);
  const overrides = parsed.success ? parsed.data : {};

  const opportunity = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: {
      relatedFunds: true,
      functionalSpecialisms: true,
      stakeholders: true,
      activities: { select: { activityId: true } },
      documents: { select: { documentId: true } },
    },
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
        title: overrides.title || opportunity.potentialRoleTitle || opportunity.name,
        hiringOrganizationId: opportunity.hiringOrganizationId,
        sourceOpportunityId: opportunity.id,
        status: "BRIEF_RECEIVED",
        priority: "NORMAL",
        confidentiality: "OPEN",
        ownerId: overrides.ownerId || opportunity.ownerId,
        practiceAreaId: opportunity.practiceAreaId,
        employmentType: opportunity.employmentType ?? "PERMANENT",
        hiringManagerPersonId: opportunity.leadContactPersonId,
        minBaseAmount: overrides.minBaseAmount ?? null,
        maxBaseAmount: overrides.maxBaseAmount ?? null,
        startDate: overrides.startDate ?? null,
        baseCurrency: opportunity.estimatedFeeCurrency ?? "GBP",
        feeType: "FIXED_FEE",
        fixedFeeAmount: overrides.agreedFeeAmount ?? opportunity.estimatedFeeAmount ?? null,
        fixedFeeCurrency: opportunity.estimatedFeeCurrency ?? null,
        engagementModel: overrides.engagementModel ?? (opportunity.type === "RETAINED_SEARCH" ? "RETAINED" : opportunity.type === "INTERIM_ASSIGNMENT" ? "INTERIM" : "CONTINGENT"),
        signedTerms: overrides.signedTerms ?? false,
        createdById: user.id,
        relatedFunds: { create: opportunity.relatedFunds.map((f) => ({ organizationId: f.organizationId })) },
        functionalSpecialisms: { create: opportunity.functionalSpecialisms.map((s) => ({ specialismId: s.specialismId })) },
        stakeholders: { create: opportunity.stakeholders.map((s) => ({ personId: s.personId, role: s.role })) },
      },
    });

    await tx.mandateStatusHistory.create({
      data: { mandateId: created.id, toStatus: "BRIEF_RECEIVED", changedById: user.id, notes: `Converted from opportunity "${opportunity.name}".` },
    });

    // Round 2 section 2: "everything else carries over automatically... notes, files and activity history" —
    // the opportunity's own activity and file history now also shows on the new mandate (the opportunity keeps
    // its copy too, so nothing already linked to it is lost).
    if (opportunity.activities.length > 0) {
      await tx.activityMandate.createMany({
        data: opportunity.activities.map((a) => ({ activityId: a.activityId, mandateId: created.id })),
        skipDuplicates: true,
      });
    }
    if (opportunity.documents.length > 0) {
      await tx.documentMandate.createMany({
        data: opportunity.documents.map((d) => ({ documentId: d.documentId, mandateId: created.id })),
        skipDuplicates: true,
      });
    }
    if (opportunity.notes?.trim()) {
      const noteActivity = await tx.activity.create({
        data: {
          workspaceId: user.workspaceId,
          type: "NOTE",
          subject: "Notes carried over from the opportunity",
          summary: opportunity.notes,
          fullNotes: opportunity.notes,
          createdById: user.id,
          assignedOwnerId: created.ownerId,
        },
      });
      await tx.activityMandate.create({ data: { activityId: noteActivity.id, mandateId: created.id } });
    }

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
