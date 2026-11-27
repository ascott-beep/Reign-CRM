import "server-only";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { formatLongDate } from "@/lib/datetime";

export type DeletableType = "ORGANIZATION" | "PERSON" | "MANDATE" | "OPPORTUNITY";

export type LinkedRow = { label: string; detail: string };
export type BlockedInfo = { message: string; alternativeLabel: string; alternativeHref: string };
export type DeleteImpact = {
  title: string;
  subtitle: string;
  linked: LinkedRow[];
  blocked: BlockedInfo | null;
};

const TYPE_LABEL: Record<DeletableType, string> = {
  ORGANIZATION: "organisation",
  PERSON: "person",
  MANDATE: "mandate",
  OPPORTUNITY: "opportunity",
};

export function deletableTypeLabel(type: DeletableType) {
  return TYPE_LABEL[type];
}

export async function getDeleteImpact(type: DeletableType, id: string, workspaceId: string): Promise<DeleteImpact> {
  if (type === "MANDATE") return mandateImpact(id, workspaceId);
  if (type === "OPPORTUNITY") return opportunityImpact(id, workspaceId);
  if (type === "PERSON") return personImpact(id, workspaceId);
  return organizationImpact(id, workspaceId);
}

async function mandateImpact(id: string, workspaceId: string): Promise<DeleteImpact> {
  const mandate = await prisma.mandate.findFirstOrThrow({
    where: { id, workspaceId },
    include: {
      hiringOrganization: { select: { name: true } },
      candidateProcesses: { select: { id: true } },
      placements: { select: { id: true, feeAmount: true, placementDate: true } },
    },
  });
  const [interviewCount, openTaskCount, documentCount] = await Promise.all([
    prisma.interview.count({ where: { candidateProcess: { mandateId: id } } }),
    prisma.taskMandate.count({ where: { mandateId: id, task: { status: { in: ["TODO", "IN_PROGRESS"] } } } }),
    prisma.documentMandate.count({ where: { mandateId: id } }),
  ]);

  const placement = mandate.placements[0];
  const blocked: BlockedInfo | null = placement
    ? {
        message: `${formatMoney(placement.feeAmount, mandate.baseCurrency ?? "GBP")} has been invoiced on this search (placement fee, ${formatLongDate(placement.placementDate)}). Deleting it would take that fee out of your reports and fee forecast.`,
        alternativeLabel: "Close search",
        alternativeHref: `/mandates/${id}`,
      }
    : null;

  return {
    title: "Delete this mandate?",
    subtitle: `${mandate.reference} · ${mandate.title} · ${mandate.hiringOrganization.name}`,
    linked: [
      { label: `${mandate.candidateProcesses.length} candidates`, detail: "Taken off this search. The people stay in the CRM." },
      { label: `${interviewCount} interviews`, detail: "Cancelled and removed with the mandate." },
      { label: `${openTaskCount} open tasks`, detail: "Deleted with the mandate." },
      { label: `${documentCount} documents`, detail: "Kept with the mandate, so they return if you restore it." },
      { label: "Activity history", detail: 'Kept, with a "Mandate deleted" entry added.' },
    ],
    blocked,
  };
}

async function opportunityImpact(id: string, workspaceId: string): Promise<DeleteImpact> {
  const opportunity = await prisma.opportunity.findFirstOrThrow({
    where: { id, workspaceId },
    include: { hiringOrganization: { select: { name: true } }, wonMandate: { select: { id: true, reference: true } } },
  });
  const [openTaskCount, documentCount] = await Promise.all([
    prisma.taskOpportunity.count({ where: { opportunityId: id, task: { status: { in: ["TODO", "IN_PROGRESS"] } } } }),
    prisma.documentOpportunity.count({ where: { opportunityId: id } }),
  ]);

  const blocked: BlockedInfo | null =
    opportunity.stage === "WON" && opportunity.wonMandate
      ? {
          message: `This opportunity is marked Won and has a live mandate (${opportunity.wonMandate.reference}). Deleting it would break that link and take it out of win/loss reporting.`,
          alternativeLabel: "Edit opportunity",
          alternativeHref: `/opportunities/${id}/edit`,
        }
      : null;

  return {
    title: "Delete this opportunity?",
    subtitle: `${opportunity.potentialRoleTitle ?? opportunity.name} · ${opportunity.hiringOrganization.name}`,
    linked: [
      { label: `${openTaskCount} open tasks`, detail: "Deleted with the opportunity." },
      { label: `${documentCount} documents`, detail: "Kept with the opportunity, so they return if you restore it." },
      { label: "Activity history", detail: 'Kept, with an "Opportunity deleted" entry added.' },
    ],
    blocked,
  };
}

async function personImpact(id: string, workspaceId: string): Promise<DeleteImpact> {
  const person = await prisma.person.findFirstOrThrow({
    where: { id, workspaceId },
    include: { candidateProcesses: { select: { id: true, mandate: { select: { status: true } } } }, placements: { select: { id: true, placementDate: true } } },
  });
  const [openTaskCount, documentCount] = await Promise.all([
    prisma.taskPerson.count({ where: { personId: id, task: { status: { in: ["TODO", "IN_PROGRESS"] } } } }),
    prisma.documentPerson.count({ where: { personId: id } }),
  ]);

  const placement = person.placements[0];
  const blocked: BlockedInfo | null = placement
    ? {
        message: `${person.firstName} was placed on ${formatLongDate(placement.placementDate)}. Deleting a placed candidate would take that placement out of your reports — anonymise them instead.`,
        alternativeLabel: "Go to person",
        alternativeHref: `/people/${id}`,
      }
    : null;

  return {
    title: "Delete this person?",
    subtitle: `${person.firstName} ${person.lastName}`,
    linked: [
      { label: `${person.candidateProcesses.length} searches`, detail: "Removed from each search. The mandates stay." },
      { label: `${openTaskCount} open tasks`, detail: "Deleted with the person." },
      { label: `${documentCount} documents`, detail: "Kept with the person, so they return if you restore them." },
      { label: "Activity history", detail: 'Kept, with a "Person deleted" entry added.' },
    ],
    blocked,
  };
}

export type RecentlyDeletedRow = {
  type: DeletableType;
  id: string;
  label: string;
  subtitle: string;
  /** The hiring organisation name for a mandate/opportunity, so the Record column can read "Org · Title". */
  orgName: string | null;
  archivedAt: Date;
  archivedByName: string | null;
  archiveReason: string | null;
};

/** Section 9.3 / screen 14 — every archived record across the four deletable types, newest first. */
export async function listRecentlyDeleted(workspaceId: string): Promise<RecentlyDeletedRow[]> {
  const [organizations, people, mandates, opportunities] = await Promise.all([
    prisma.organization.findMany({
      where: { workspaceId, archivedAt: { not: null } },
      include: { archivedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.person.findMany({
      where: { workspaceId, archivedAt: { not: null } },
      include: { archivedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.mandate.findMany({
      where: { workspaceId, archivedAt: { not: null } },
      include: { archivedBy: { select: { firstName: true, lastName: true } }, hiringOrganization: { select: { name: true } } },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId, archivedAt: { not: null } },
      include: { archivedBy: { select: { firstName: true, lastName: true } }, hiringOrganization: { select: { name: true } } },
    }),
  ]);

  const byName = (u: { firstName: string; lastName: string } | null) => (u ? `${u.firstName} ${u.lastName}` : null);

  const rows: RecentlyDeletedRow[] = [
    ...organizations.map((o) => ({
      type: "ORGANIZATION" as const,
      id: o.id,
      label: o.name,
      subtitle: deletableTypeLabel("ORGANIZATION"),
      orgName: null,
      archivedAt: o.archivedAt!,
      archivedByName: byName(o.archivedBy),
      archiveReason: o.archiveReason,
    })),
    ...people.map((p) => ({
      type: "PERSON" as const,
      id: p.id,
      label: `${p.firstName} ${p.lastName}`,
      subtitle: deletableTypeLabel("PERSON"),
      orgName: null,
      archivedAt: p.archivedAt!,
      archivedByName: byName(p.archivedBy),
      archiveReason: p.archiveReason,
    })),
    ...mandates.map((m) => ({
      type: "MANDATE" as const,
      id: m.id,
      label: m.title,
      subtitle: `${deletableTypeLabel("MANDATE")} · ${m.hiringOrganization.name}`,
      orgName: m.hiringOrganization.name,
      archivedAt: m.archivedAt!,
      archivedByName: byName(m.archivedBy),
      archiveReason: m.archiveReason,
    })),
    ...opportunities.map((o) => ({
      type: "OPPORTUNITY" as const,
      id: o.id,
      label: o.name,
      subtitle: `${deletableTypeLabel("OPPORTUNITY")} · ${o.hiringOrganization.name}`,
      orgName: o.hiringOrganization.name,
      archivedAt: o.archivedAt!,
      archivedByName: byName(o.archivedBy),
      archiveReason: o.archiveReason,
    })),
  ];

  return rows.sort((a, b) => b.archivedAt.getTime() - a.archivedAt.getTime());
}

async function organizationImpact(id: string, workspaceId: string): Promise<DeleteImpact> {
  const org = await prisma.organization.findFirstOrThrow({ where: { id, workspaceId } });
  const [mandateCount, opportunityCount, peopleCount, documentCount] = await Promise.all([
    prisma.mandate.count({ where: { hiringOrganizationId: id, archivedAt: null } }),
    prisma.opportunity.count({ where: { hiringOrganizationId: id, archivedAt: null } }),
    prisma.personOrganizationAssociation.count({ where: { organizationId: id } }),
    prisma.documentOrganization.count({ where: { organizationId: id } }),
  ]);

  return {
    title: "Delete this organisation?",
    subtitle: org.name,
    linked: [
      { label: `${mandateCount} mandates`, detail: "Kept, still linked to this client." },
      { label: `${opportunityCount} opportunities`, detail: "Kept, still linked to this client." },
      { label: `${peopleCount} people`, detail: "Stay in the CRM; the link to this organisation stays too." },
      { label: `${documentCount} documents`, detail: "Kept with the organisation, so they return if you restore it." },
      { label: "Activity history", detail: 'Kept, with an "Organisation deleted" entry added.' },
    ],
    blocked: null,
  };
}
