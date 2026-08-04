import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewMandate, type SessionUser } from "@/lib/permissions";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  const process = await prisma.candidateProcess.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      candidatePerson: { include: { candidateProfile: true } },
      mandate: { include: { hiringOrganization: true } },
      stageHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } },
      interviews: { orderBy: { scheduledStart: "desc" } },
      offers: { orderBy: { createdAt: "desc" } },
      placement: true,
    },
  });
  if (!process) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canViewMandate(user, process.mandateId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    id: process.id,
    stage: process.stage,
    mandateId: process.mandateId,
    mandateTitle: process.mandate.title,
    mandateReference: process.mandate.reference,
    organizationName: process.mandate.hiringOrganization.name,
    candidatePersonId: process.candidatePersonId,
    candidateName: `${process.candidatePerson.firstName} ${process.candidatePerson.lastName}`,
    candidateRating: process.candidatePerson.candidateProfile?.rating ?? null,
    candidateStatus: process.candidatePerson.candidateProfile?.status ?? null,
    overallScore: process.overallScore,
    functionalFitScore: process.functionalFitScore,
    peExperienceScore: process.peExperienceScore,
    sectorFitScore: process.sectorFitScore,
    motivationScore: process.motivationScore,
    compensationFitScore: process.compensationFitScore,
    locationFitScore: process.locationFitScore,
    assessmentSummary: process.assessmentSummary,
    risksConcerns: process.risksConcerns,
    clientFeedback: process.clientFeedback,
    rejectionReason: process.rejectionReason,
    rejectionExplanation: process.rejectionExplanation,
    withdrawalReason: process.withdrawalReason,
    withdrawalExplanation: process.withdrawalExplanation,
    stageHistory: process.stageHistory.map((h) => ({
      id: h.id,
      fromStage: h.fromStage,
      toStage: h.toStage,
      changedAt: h.changedAt.toISOString(),
      changedBy: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    })),
    interviews: process.interviews.map((i) => ({
      id: i.id,
      type: i.type,
      roundNumber: i.roundNumber,
      scheduledStart: i.scheduledStart.toISOString(),
      outcome: i.outcome,
      locationOrLink: i.locationOrLink,
      clientFeedback: i.clientFeedback,
    })),
    offers: process.offers.map((o) => ({
      id: o.id,
      status: o.status,
      baseAmount: o.baseAmount?.toString() ?? null,
      baseCurrency: o.baseCurrency,
      offerDate: o.offerDate?.toISOString() ?? null,
      proposedStartDate: o.proposedStartDate?.toISOString() ?? null,
    })),
    placement: process.placement
      ? {
          id: process.placement.id,
          placementDate: process.placement.placementDate.toISOString(),
          status: process.placement.status,
        }
      : null,
  });
}
