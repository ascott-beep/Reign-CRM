import "server-only";
import { prisma } from "@/lib/prisma";
import { OPEN_OPPORTUNITY_STAGES } from "@/lib/rules";

export type Suggestion =
  | { kind: "FIRST_CALL"; id: string; title: string; subtitle: string; candidateProcessId: string }
  | { kind: "CHASE_OFFER"; id: string; title: string; subtitle: string; candidateProcessId: string }
  | { kind: "SET_NEXT_STEPS"; id: string; title: string; subtitle: string; count: number }
  | { kind: "GUARANTEE_CHECKIN"; id: string; title: string; subtitle: string; placementId: string };

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/**
 * Section 5 "Suggested tasks" — computed fresh on every Tasks page load,
 * nothing persisted until the user clicks Add. Each rule only fires while
 * there's no open task already covering it (primaryNextTaskId null), so a
 * suggestion disappears the moment it's actioned.
 */
export async function computeSuggestions(workspaceId: string): Promise<Suggestion[]> {
  const [contactRequired, offerStage, openOpportunitiesNoTask, placedWithStartDate] = await Promise.all([
    prisma.candidateProcess.findMany({
      where: { workspaceId, stage: "CONTACT_REQUIRED", stageEnteredAt: { lte: daysAgo(2) }, primaryNextTaskId: null },
      select: { id: true, candidatePerson: { select: { firstName: true, lastName: true } }, mandate: { select: { hiringOrganization: { select: { name: true } } } } },
      take: 10,
    }),
    prisma.candidateProcess.findMany({
      where: { workspaceId, stage: "OFFER", stageEnteredAt: { lte: daysAgo(3) }, primaryNextTaskId: null },
      select: {
        id: true,
        candidatePerson: { select: { firstName: true, lastName: true } },
        mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } },
      },
      take: 10,
    }),
    prisma.opportunity.count({ where: { workspaceId, archivedAt: null, stage: { in: OPEN_OPPORTUNITY_STAGES }, primaryNextTaskId: null } }),
    prisma.placement.findMany({
      where: { startDate: { not: null }, candidateProcess: { workspaceId } },
      select: { id: true, startDate: true, candidatePerson: { select: { firstName: true, lastName: true } } },
      take: 20,
    }),
  ]);

  const suggestions: Suggestion[] = [];

  for (const p of contactRequired) {
    suggestions.push({
      kind: "FIRST_CALL",
      id: `first-call-${p.id}`,
      title: `First call with ${p.candidatePerson.firstName} ${p.candidatePerson.lastName}`,
      subtitle: `${p.mandate.hiringOrganization.name} · contact required, no activity`,
      candidateProcessId: p.id,
    });
  }

  for (const p of offerStage) {
    suggestions.push({
      kind: "CHASE_OFFER",
      id: `chase-offer-${p.id}`,
      title: `Chase ${p.mandate.hiringOrganization.name} on the ${p.mandate.title} offer`,
      subtitle: "Offer stage · no response logged",
      candidateProcessId: p.id,
    });
  }

  if (openOpportunitiesNoTask > 0) {
    suggestions.push({
      kind: "SET_NEXT_STEPS",
      id: "set-next-steps",
      title: `Set next steps on ${openOpportunitiesNoTask} opportunit${openOpportunitiesNoTask === 1 ? "y" : "ies"}`,
      subtitle: "Open opportunities with no linked task",
      count: openOpportunitiesNoTask,
    });
  }

  // "Placed with a start date" also needs no guarantee-check-in task created yet —
  // checked via relatedRecordType/Id since Placement has no dedicated join table.
  const existingCheckins = placedWithStartDate.length
    ? await prisma.task.findMany({
        where: { workspaceId, relatedRecordType: "PLACEMENT", relatedRecordId: { in: placedWithStartDate.map((p) => p.id) } },
        select: { relatedRecordId: true },
      })
    : [];
  const alreadyHasCheckin = new Set(existingCheckins.map((t) => t.relatedRecordId));
  for (const placement of placedWithStartDate) {
    if (alreadyHasCheckin.has(placement.id)) continue;
    suggestions.push({
      kind: "GUARANTEE_CHECKIN",
      id: `guarantee-${placement.id}`,
      title: `90-day guarantee check-in: ${placement.candidatePerson.firstName} ${placement.candidatePerson.lastName}`,
      subtitle: `Started ${placement.startDate!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      placementId: placement.id,
    });
  }

  return suggestions;
}
