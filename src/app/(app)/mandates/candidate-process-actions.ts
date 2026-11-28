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
  markSearchFilledSchema,
} from "@/lib/validation/candidate-process";
import { isCandidateInPlay, mandateBoardColumn } from "@/lib/rules";
import { writeAuditLog } from "@/lib/audit";
import type { MandateStatus } from "@prisma/client";

const LIVE_MANDATE_STATUS_SET = new Set<MandateStatus>(["BRIEF_RECEIVED", "SEARCH_ACTIVE", "LONGLISTING", "SHORTLISTING", "INTERVIEWING", "OFFER"]);
const BOARD_COLUMN_TO_STATUS: Record<string, MandateStatus> = {
  Brief: "BRIEF_RECEIVED",
  Searching: "SEARCH_ACTIVE",
  Shortlist: "SHORTLISTING",
  Interviews: "INTERVIEWING",
  Offer: "OFFER",
};

/**
 * Round 5 screen 13: a mandate's board column is worked out from its
 * furthest candidate, so the stored status needs to stay in step with it
 * automatically — called after any candidate is added or moved. Leaves
 * Filled/Cancelled/On hold alone; those stay explicit only (Mark filled).
 */
async function syncMandateStatusFromCandidates(mandateId: string) {
  const mandate = await prisma.mandate.findUnique({
    where: { id: mandateId },
    select: { status: true, candidateProcesses: { select: { stage: true } } },
  });
  if (!mandate || !LIVE_MANDATE_STATUS_SET.has(mandate.status)) return;
  const column = mandateBoardColumn(mandate.candidateProcesses.map((p) => p.stage));
  const target = BOARD_COLUMN_TO_STATUS[column];
  if (target && target !== mandate.status) {
    await prisma.mandate.update({ where: { id: mandateId }, data: { status: target } });
  }
}

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
        candidateProfile: { create: { status: "PROSPECT", rating: (data.fit as any) ?? "NOT_RATED", consentStatus: "NOT_REQUESTED", legalBasis: "NOT_SET" } },
      },
    });
    candidatePersonId = person.id;
  } else if (data.fit) {
    await prisma.candidateProfile.updateMany({ where: { personId: candidatePersonId }, data: { rating: data.fit as any } });
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
        data: {
          stage: data.startAt,
          rejectionReason: null,
          rejectionExplanation: null,
          withdrawalReason: null,
          withdrawalExplanation: null,
          exitDecidedBy: null,
        },
      });
      await prisma.candidateProcessStageHistory.create({
        data: {
          candidateProcessId: reopened.id,
          fromStage: existing.stage,
          toStage: data.startAt,
          changedById: user.id,
          notes: data.note ?? "Candidate reopened for this mandate.",
        },
      });
      await syncMandateStatusFromCandidates(data.mandateId);
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
      stage: data.startAt,
      source: data.source as any,
      addedById: user.id,
      ownerId: user.id,
      stageHistory: { create: [{ toStage: data.startAt, changedById: user.id, notes: data.note ?? "Added to mandate pipeline." }] },
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "CandidateProcess", entityId: process.id, action: "CREATE" });

  await syncMandateStatusFromCandidates(data.mandateId);
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
  exitDecidedBy?: string;
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
        exitDecidedBy: ["REJECTED", "WITHDRAWN", "ON_HOLD"].includes(data.toStage) ? (data.exitDecidedBy ?? null) : null,
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

  await syncMandateStatusFromCandidates(process.mandateId);
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
          title: `Guarantee period ends · check in on placement`,
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

/**
 * d03 "Mark search as filled": the mandate-level close-out flow, used either
 * from the check banner (section 5 rule 1) or when a mandate card is moved
 * to Filled on the board. If the chosen candidate isn't already Placed, this
 * records the placement first (reusing the same effects as placeCandidateAction);
 * either way it then sets the mandate to Filled and, if asked, creates a
 * "let them know" task for every other candidate still active on the search.
 * Those candidates' own stage is left untouched — only the consultant moving
 * them to Rejected/Withdrawn via d04, once they've actually been told,
 * should change their status.
 */
export async function markSearchFilledAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = markSearchFilledSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  if (!(await canViewMandate(user, data.mandateId))) throw new PermissionError("You do not have access to this mandate.");

  const mandate = await prisma.mandate.findUniqueOrThrow({ where: { id: data.mandateId } });
  const process = await prisma.candidateProcess.findUniqueOrThrow({
    where: { id: data.candidateProcessId },
    include: { placement: true, candidatePerson: true },
  });
  if (process.mandateId !== data.mandateId) throw new Error("That candidate is not on this search.");

  const guaranteeEndDate = (() => {
    if (!mandate.guaranteeValue || !mandate.guaranteeUnit) return null;
    const base = data.startDate ?? data.placementDate;
    const d = new Date(base);
    if (mandate.guaranteeUnit.toLowerCase().startsWith("week")) d.setDate(d.getDate() + mandate.guaranteeValue * 7);
    else d.setMonth(d.getMonth() + mandate.guaranteeValue);
    return d;
  })();

  const completionFee = (() => {
    const base = data.agreedBaseAmount ?? (mandate.maxBaseAmount ? Number(mandate.maxBaseAmount) : null);
    if (mandate.feeType === "FIXED_FEE" && mandate.fixedFeeAmount) return Number(mandate.fixedFeeAmount);
    if (mandate.feePercentage && base) return (base * Number(mandate.feePercentage)) / 100;
    return null;
  })();

  await prisma.$transaction(async (tx) => {
    if (process.stage !== "PLACED" || !process.placement) {
      await tx.placement.create({
        data: {
          candidateProcessId: process.id,
          mandateId: mandate.id,
          candidatePersonId: process.candidatePersonId,
          hiringOrganizationId: mandate.hiringOrganizationId,
          placementDate: data.placementDate,
          startDate: data.startDate ?? null,
          employmentType: mandate.employmentType,
          agreedBaseAmount: data.agreedBaseAmount ?? null,
          agreedBaseCurrency: data.agreedBaseCurrency ?? mandate.baseCurrency ?? null,
          feeAmount: completionFee,
          feeCurrency: mandate.baseCurrency ?? null,
          guaranteeEndDate,
          status: "PLANNED_START",
          createdById: user.id,
        },
      });
      await tx.candidateProcessStageHistory.create({
        data: { candidateProcessId: process.id, fromStage: process.stage, toStage: "PLACED", changedById: user.id, notes: "Marked as placed when the search was closed." },
      });
      await tx.candidateProcess.update({ where: { id: process.id }, data: { stage: "PLACED", stageEnteredAt: new Date(), placedAt: new Date() } });
      await tx.candidateProfile.updateMany({ where: { personId: process.candidatePersonId }, data: { status: "PLACED" } });
    } else if (data.startDate || data.agreedBaseAmount) {
      await tx.placement.update({
        where: { id: process.placement.id },
        data: {
          startDate: data.startDate ?? process.placement.startDate,
          agreedBaseAmount: data.agreedBaseAmount ?? process.placement.agreedBaseAmount,
          agreedBaseCurrency: data.agreedBaseCurrency ?? process.placement.agreedBaseCurrency,
          guaranteeEndDate: guaranteeEndDate ?? process.placement.guaranteeEndDate,
        },
      });
    }

    if (mandate.status !== "FILLED") {
      await tx.mandate.update({ where: { id: mandate.id }, data: { status: "FILLED", statusEnteredAt: new Date(), filledDate: new Date() } });
      await tx.mandateStatusHistory.create({
        data: { mandateId: mandate.id, fromStatus: mandate.status, toStatus: "FILLED", changedById: user.id, notes: "Marked as filled." },
      });
    }

    if (data.notifyOthers) {
      const candidates = await tx.candidateProcess.findMany({
        where: { mandateId: mandate.id, id: { not: process.id } },
        include: { candidatePerson: true },
      });
      const others = candidates.filter((o) => isCandidateInPlay(o.stage));
      if (others.length > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2);
        await tx.task.createMany({
          data: others.map((o) => ({
            workspaceId: user.workspaceId,
            title: `Let ${o.candidatePerson.firstName} know the ${mandate.title} search has been filled`,
            type: "FOLLOW_UP",
            status: "TODO",
            priority: "NORMAL",
            assignedUserId: mandate.ownerId,
            createdById: user.id,
            dueDate,
            relatedRecordType: "CANDIDATE_PROCESS",
            relatedRecordId: o.id,
          })),
        });
      }
    }

    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Mandate", entityId: mandate.id, action: "STAGE_CHANGE", changedFields: { toStatus: "FILLED" } },
    });
  });

  revalidatePath(`/mandates/${mandate.id}`);
}
