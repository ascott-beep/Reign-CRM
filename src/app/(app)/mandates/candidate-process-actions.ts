"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canViewMandate, PermissionError } from "@/lib/permissions";
import {
  addCandidateToMandateSchema,
  processStageChangeSchema,
  processAssessmentSchema,
  interviewFormSchema,
  interviewOutcomeSchema,
  offerFormSchema,
  placementFormSchema,
} from "@/lib/validation/candidate-process";
import { writeAuditLog } from "@/lib/audit";

async function checkOffLimits(workspaceId: string, mandateOrgId: string, candidatePersonId: string) {
  const restrictions = await prisma.offLimitsRestriction.findMany({
    where: {
      workspaceId,
      OR: [{ organizationId: mandateOrgId }, { personId: candidatePersonId }],
    },
  });
  const now = new Date();
  const active = restrictions.filter((r) => (r.activeOverride ?? (!r.endDate || r.endDate > now)) && r.startDate <= now);
  const block = active.find((r) => r.severity === "BLOCK");
  const warning = active.find((r) => r.severity === "WARNING");
  return { block, warning };
}

export async function addCandidateToMandateAction(formData: FormData, offLimitsOverrideReason?: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = addCandidateToMandateSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  if (!(await canViewMandate(user, data.mandateId))) throw new PermissionError("You do not have access to this mandate.");
  const mandate = await prisma.mandate.findUniqueOrThrow({ where: { id: data.mandateId } });

  let candidatePersonId = data.candidatePersonId;
  if (!candidatePersonId) {
    if (!data.newCandidateFirstName || !data.newCandidateLastName) {
      throw new Error("Provide a first and last name for the new candidate.");
    }
    const person = await prisma.person.create({
      data: {
        workspaceId: user.workspaceId,
        firstName: data.newCandidateFirstName,
        lastName: data.newCandidateLastName,
        primaryEmail: data.newCandidateEmail ?? null,
        personTypes: ["CANDIDATE"],
        relationshipStatus: "ENGAGED",
        source: "DATABASE",
        createdById: user.id,
        candidateProfile: { create: { status: "PROSPECT", rating: "NOT_RATED", consentStatus: "NOT_REQUESTED", legalBasis: "NOT_SET" } },
      },
    });
    candidatePersonId = person.id;
  }

  const { block, warning } = await checkOffLimits(user.workspaceId, mandate.hiringOrganizationId, candidatePersonId);
  if (block) {
    if (user.role !== "ADMIN") {
      throw new Error(`Blocked by off-limits restriction: ${block.reason}`);
    }
    if (!offLimitsOverrideReason) {
      throw new Error("OFF_LIMITS_OVERRIDE_REQUIRED");
    }
    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorId: user.id,
      entityType: "OffLimitsRestriction",
      entityId: block.id,
      action: "OFF_LIMITS_OVERRIDE",
      changedFields: { mandateId: data.mandateId, candidatePersonId, overrideReason: offLimitsOverrideReason },
    });
  }

  const existing = await prisma.candidateProcess.findUnique({
    where: { mandateId_candidatePersonId: { mandateId: data.mandateId, candidatePersonId } },
  });
  if (existing) {
    if (["REJECTED", "WITHDRAWN", "ON_HOLD"].includes(existing.stage)) {
      // Reopen rather than duplicate — preserves full stage history.
      const reopened = await prisma.candidateProcess.update({
        where: { id: existing.id },
        data: { stage: "SOURCED", rejectionReason: null, rejectionExplanation: null, withdrawalReason: null, withdrawalExplanation: null },
      });
      await prisma.candidateProcessStageHistory.create({
        data: { candidateProcessId: reopened.id, fromStage: existing.stage, toStage: "SOURCED", changedById: user.id, notes: "Candidate reopened for this mandate." },
      });
      revalidatePath(`/mandates/${data.mandateId}`);
      return { warning: warning?.reason };
    }
    throw new Error("This candidate is already in the pipeline for this mandate.");
  }

  const process = await prisma.candidateProcess.create({
    data: {
      workspaceId: user.workspaceId,
      mandateId: data.mandateId,
      candidatePersonId,
      stage: "SOURCED",
      source: data.source as any,
      addedById: user.id,
      ownerId: user.id,
      stageHistory: { create: [{ toStage: "SOURCED", changedById: user.id, notes: "Added to mandate pipeline." }] },
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "CandidateProcess", entityId: process.id, action: "CREATE" });

  revalidatePath(`/mandates/${data.mandateId}`);
  return { warning: warning?.reason };
}

export async function changeProcessStageAction(input: {
  candidateProcessId: string;
  toStage: string;
  rejectionReason?: string;
  rejectionExplanation?: string;
  withdrawalReason?: string;
  withdrawalExplanation?: string;
  notes?: string;
}) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const parsed = processStageChangeSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  if (data.toStage === "PLACED") {
    throw new Error("Use the Placement flow to move a candidate to Placed.");
  }
  if (data.toStage === "REJECTED" && !data.rejectionReason) {
    throw new Error("A rejection reason is required.");
  }
  if (data.toStage === "WITHDRAWN" && !data.withdrawalReason) {
    throw new Error("A withdrawal reason is required.");
  }

  const process = await prisma.candidateProcess.findUniqueOrThrow({ where: { id: data.candidateProcessId }, include: { mandate: true } });
  if (!(await canViewMandate(user, process.mandateId))) throw new PermissionError("You do not have access to this mandate.");
  if (process.stage === data.toStage) return;

  await prisma.$transaction([
    prisma.candidateProcess.update({
      where: { id: data.candidateProcessId },
      data: {
        stage: data.toStage as any,
        stageEnteredAt: new Date(),
        rejectionReason: data.toStage === "REJECTED" ? (data.rejectionReason as any) : null,
        rejectionExplanation: data.toStage === "REJECTED" ? (data.rejectionExplanation ?? null) : null,
        withdrawalReason: data.toStage === "WITHDRAWN" ? (data.withdrawalReason as any) : null,
        withdrawalExplanation: data.toStage === "WITHDRAWN" ? (data.withdrawalExplanation ?? null) : null,
        rejectedAt: data.toStage === "REJECTED" ? new Date() : null,
        withdrawnAt: data.toStage === "WITHDRAWN" ? new Date() : null,
        submittedAt: data.toStage === "SUBMITTED" ? new Date() : undefined,
      },
    }),
    prisma.candidateProcessStageHistory.create({
      data: { candidateProcessId: data.candidateProcessId, fromStage: process.stage, toStage: data.toStage as any, changedById: user.id, notes: data.notes ?? null },
    }),
  ]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "CandidateProcess",
    entityId: data.candidateProcessId,
    action: "STAGE_CHANGE",
    changedFields: { fromStage: process.stage, toStage: data.toStage },
  });

  revalidatePath(`/mandates/${process.mandateId}`);
}

export async function updateProcessAssessmentAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = processAssessmentSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const process = await prisma.candidateProcess.update({
    where: { id: data.candidateProcessId },
    data: {
      overallScore: data.overallScore ?? null,
      functionalFitScore: data.functionalFitScore ?? null,
      peExperienceScore: data.peExperienceScore ?? null,
      sectorFitScore: data.sectorFitScore ?? null,
      motivationScore: data.motivationScore ?? null,
      compensationFitScore: data.compensationFitScore ?? null,
      locationFitScore: data.locationFitScore ?? null,
      assessmentSummary: data.assessmentSummary ?? null,
      risksConcerns: data.risksConcerns ?? null,
      clientFeedback: data.clientFeedback ?? null,
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "CandidateProcess", entityId: process.id, action: "UPDATE" });
  revalidatePath(`/mandates/${process.mandateId}`);
}

export async function scheduleInterviewAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = interviewFormSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const interview = await prisma.interview.create({
    data: {
      candidateProcessId: data.candidateProcessId,
      type: data.type as any,
      roundNumber: data.roundNumber,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd ?? null,
      locationOrLink: data.locationOrLink ?? null,
      preparationNotes: data.preparationNotes ?? null,
      createdById: user.id,
      internalParticipants: { create: [{ userId: user.id }] },
    },
    include: { candidateProcess: true },
  });

  const assignedUsers = await prisma.mandateAssignedUser.findMany({ where: { mandateId: interview.candidateProcess.mandateId } });
  await prisma.inAppNotification.createMany({
    data: [interview.candidateProcess.ownerId, ...assignedUsers.map((a) => a.userId)]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((userId) => ({ userId, type: "INTERVIEW_SCHEDULED" as const, title: `Interview scheduled (round ${interview.roundNumber})` })),
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Interview", entityId: interview.id, action: "CREATE" });
  revalidatePath(`/mandates/${interview.candidateProcess.mandateId}`);
}

export async function recordInterviewOutcomeAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = interviewOutcomeSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const interview = await prisma.interview.update({
    where: { id: data.interviewId },
    data: {
      outcome: data.outcome as any,
      candidateFeedback: data.candidateFeedback ?? null,
      clientFeedback: data.clientFeedback ?? null,
      internalNotes: data.internalNotes ?? null,
    },
    include: { candidateProcess: true },
  });

  revalidatePath(`/mandates/${interview.candidateProcess.mandateId}`);
}

export async function createOfferAction(formData: FormData, advanceStage = true) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = offerFormSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const process = await prisma.candidateProcess.findUniqueOrThrow({ where: { id: data.candidateProcessId } });

  const offer = await prisma.$transaction(async (tx) => {
    const created = await tx.offer.create({
      data: {
        candidateProcessId: data.candidateProcessId,
        status: data.status as any,
        offerDate: data.offerDate ?? null,
        expiryDate: data.expiryDate ?? null,
        baseAmount: data.baseAmount ?? null,
        baseCurrency: data.baseCurrency ?? null,
        bonusPercentage: data.bonusPercentage ?? null,
        proposedStartDate: data.proposedStartDate ?? null,
        notes: data.notes ?? null,
        createdById: user.id,
      },
    });

    if (advanceStage && process.stage !== "OFFER") {
      await tx.candidateProcess.update({ where: { id: data.candidateProcessId }, data: { stage: "OFFER", stageEnteredAt: new Date() } });
      await tx.candidateProcessStageHistory.create({
        data: { candidateProcessId: data.candidateProcessId, fromStage: process.stage, toStage: "OFFER", changedById: user.id, notes: "Offer created." },
      });
    }

    return created;
  });

  const notifyUsers = [process.ownerId];
  await prisma.inAppNotification.createMany({
    data: notifyUsers.map((userId) => ({ userId, type: "PROCESS_OFFER" as const, title: "Candidate process reached Offer stage", relatedEntityType: "CandidateProcess", relatedEntityId: process.id })),
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Offer", entityId: offer.id, action: "CREATE" });
  revalidatePath(`/mandates/${(await prisma.candidateProcess.findUnique({ where: { id: data.candidateProcessId } }))!.mandateId}`);
}

/**
 * Candidate placement (spec 8.4): validate, create the placement, mark the
 * accepted offer, update the process stage/history, set candidate status,
 * fill the mandate if the required hires have been reached, and create a
 * guarantee-end follow-up task — all in one transaction.
 */
export async function placeCandidateAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = placementFormSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  const process = await prisma.candidateProcess.findUniqueOrThrow({ where: { id: data.candidateProcessId }, include: { mandate: true } });
  if (!(await canViewMandate(user, process.mandateId))) throw new PermissionError("You do not have access to this mandate.");

  const guaranteeEndDate = data.guaranteeMonths
    ? (() => {
        const base = data.startDate ?? data.placementDate;
        const d = new Date(base);
        d.setMonth(d.getMonth() + data.guaranteeMonths!);
        return d;
      })()
    : null;

  await prisma.$transaction(async (tx) => {
    const placement = await tx.placement.create({
      data: {
        candidateProcessId: data.candidateProcessId,
        mandateId: process.mandateId,
        candidatePersonId: process.candidatePersonId,
        hiringOrganizationId: process.mandate.hiringOrganizationId,
        acceptedOfferId: data.acceptedOfferId ?? null,
        placementDate: data.placementDate,
        startDate: data.startDate ?? null,
        employmentType: data.employmentType as any,
        agreedBaseAmount: data.agreedBaseAmount ?? null,
        agreedBaseCurrency: data.agreedBaseCurrency ?? null,
        feeAmount: data.feeAmount ?? null,
        feeCurrency: data.feeCurrency ?? null,
        guaranteeEndDate,
        status: "PLANNED_START",
        createdById: user.id,
      },
    });

    if (data.acceptedOfferId) {
      await tx.offer.update({ where: { id: data.acceptedOfferId }, data: { status: "ACCEPTED" } });
    }

    await tx.candidateProcess.update({
      where: { id: data.candidateProcessId },
      data: { stage: "PLACED", stageEnteredAt: new Date(), placedAt: new Date() },
    });
    await tx.candidateProcessStageHistory.create({
      data: { candidateProcessId: data.candidateProcessId, fromStage: process.stage, toStage: "PLACED", changedById: user.id, notes: "Candidate placed." },
    });

    await tx.candidateProfile.updateMany({ where: { personId: process.candidatePersonId }, data: { status: "PLACED" } });

    const placedCount = await tx.candidateProcess.count({ where: { mandateId: process.mandateId, stage: "PLACED" } });
    if (placedCount >= process.mandate.numberOfHires) {
      await tx.mandate.update({ where: { id: process.mandateId }, data: { status: "FILLED", statusEnteredAt: new Date(), filledDate: new Date() } });
      await tx.mandateStatusHistory.create({
        data: { mandateId: process.mandateId, fromStatus: process.mandate.status, toStatus: "FILLED", changedById: user.id, notes: "Required hires reached." },
      });
    }

    if (guaranteeEndDate) {
      await tx.task.create({
        data: {
          workspaceId: user.workspaceId,
          title: `Guarantee period ends — check in on placement`,
          type: "FOLLOW_UP",
          status: "TODO",
          priority: "NORMAL",
          assignedUserId: process.ownerId,
          createdById: user.id,
          dueDate: guaranteeEndDate,
          relatedRecordType: "CANDIDATE_PROCESS",
          relatedRecordId: process.id,
          candidateProcesses: { create: [{ candidateProcessId: process.id }] },
          mandates: { create: [{ mandateId: process.mandateId }] },
        },
      });
    }

    await tx.inAppNotification.create({
      data: { userId: process.ownerId, type: "PROCESS_PLACED", title: "Candidate placed", relatedEntityType: "CandidateProcess", relatedEntityId: process.id },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Placement",
        entityId: placement.id,
        action: "CREATE",
        changedFields: { candidateProcessId: process.id, mandateId: process.mandateId },
      },
    });
  });

  revalidatePath(`/mandates/${process.mandateId}`);
}
