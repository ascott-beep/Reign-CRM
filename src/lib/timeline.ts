import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type TimelineItem =
  | {
      kind: "activity";
      id: string;
      date: Date;
      activityType: string;
      direction: string;
      outcome: string | null;
      subject: string | null;
      summary: string | null;
      actorName: string;
      private: boolean;
      canTogglePrivacy: boolean;
    }
  | {
      kind: "task";
      id: string;
      date: Date;
      title: string;
      status: string;
      completed: boolean;
      assigneeName: string;
    }
  | {
      kind: "stage_change";
      id: string;
      date: Date;
      fromLabel: string | null;
      toLabel: string;
      actorName: string;
    }
  | {
      kind: "file";
      id: string;
      date: Date;
      displayName: string;
      category: string;
      documentId: string;
    };

const ACTIVITY_INCLUDE = { createdBy: true, people: { include: { person: true } } } satisfies Prisma.ActivityInclude;
type ActivityWithPeople = Prisma.ActivityGetPayload<{ include: typeof ACTIVITY_INCLUDE }>;

/** Round 2 section 7 "Private flag per email: other users see 'Email with <name>' without the content." */
function mapActivity(activity: ActivityWithPeople, viewerId: string): TimelineItem {
  const canTogglePrivacy = viewerId === activity.assignedOwnerId || viewerId === activity.createdById;
  const redact = activity.type === "EMAIL" && activity.private && !canTogglePrivacy;
  const withNames = activity.people.map((p) => `${p.person.firstName} ${p.person.lastName}`).join(", ");

  return {
    kind: "activity",
    id: activity.id,
    date: activity.occurredAt,
    activityType: activity.type,
    direction: activity.direction,
    outcome: activity.outcome,
    subject: redact ? `Email with ${withNames || "contact"}` : activity.subject,
    summary: redact ? null : activity.summary,
    actorName: `${activity.createdBy.firstName} ${activity.createdBy.lastName}`,
    private: activity.private,
    canTogglePrivacy,
  };
}

/** Opportunity-specific for now — extend with mandate/person/org variants as those pages adopt the same timeline. */
export async function getOpportunityTimeline(opportunityId: string, viewerId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks, stageHistory, documentLinks] = await Promise.all([
    prisma.activityOpportunity.findMany({
      where: { opportunityId },
      include: { activity: { include: ACTIVITY_INCLUDE } },
    }),
    prisma.taskOpportunity.findMany({
      where: { opportunityId },
      include: { task: { include: { assignedUser: true } } },
    }),
    prisma.opportunityStageHistory.findMany({
      where: { opportunityId },
      include: { changedBy: true },
    }),
    prisma.documentOpportunity.findMany({
      where: { opportunityId },
      include: { document: true },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l) => mapActivity(l.activity, viewerId)),
    ...taskLinks.map((l): TimelineItem => ({
      kind: "task",
      id: l.task.id,
      date: l.task.completedAt ?? l.task.dueDate,
      title: l.task.title,
      status: l.task.status,
      completed: l.task.status === "COMPLETED",
      assigneeName: `${l.task.assignedUser.firstName} ${l.task.assignedUser.lastName}`,
    })),
    ...stageHistory.map((h): TimelineItem => ({
      kind: "stage_change",
      id: h.id,
      date: h.changedAt,
      fromLabel: h.fromStage,
      toLabel: h.toStage,
      actorName: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    })),
    ...documentLinks.map((l): TimelineItem => ({
      kind: "file",
      id: l.document.id,
      date: l.document.uploadedAt,
      displayName: l.document.displayName,
      category: l.document.category,
      documentId: l.document.id,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getPersonTimeline(personId: string, viewerId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks] = await Promise.all([
    prisma.activityPerson.findMany({
      where: { personId },
      include: { activity: { include: ACTIVITY_INCLUDE } },
      take: 50,
    }),
    prisma.taskPerson.findMany({
      where: { personId },
      include: { task: { include: { assignedUser: true } } },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l) => mapActivity(l.activity, viewerId)),
    ...taskLinks.map((l): TimelineItem => ({
      kind: "task",
      id: l.task.id,
      date: l.task.completedAt ?? l.task.dueDate,
      title: l.task.title,
      status: l.task.status,
      completed: l.task.status === "COMPLETED",
      assigneeName: `${l.task.assignedUser.firstName} ${l.task.assignedUser.lastName}`,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getOrganizationTimeline(organizationId: string, viewerId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks] = await Promise.all([
    prisma.activityOrganization.findMany({
      where: { organizationId },
      include: { activity: { include: ACTIVITY_INCLUDE } },
      take: 50,
    }),
    prisma.taskOrganization.findMany({
      where: { organizationId },
      include: { task: { include: { assignedUser: true } } },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l) => mapActivity(l.activity, viewerId)),
    ...taskLinks.map((l): TimelineItem => ({
      kind: "task",
      id: l.task.id,
      date: l.task.completedAt ?? l.task.dueDate,
      title: l.task.title,
      status: l.task.status,
      completed: l.task.status === "COMPLETED",
      assigneeName: `${l.task.assignedUser.firstName} ${l.task.assignedUser.lastName}`,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getMandateTimeline(mandateId: string, viewerId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks, statusHistory, documentLinks] = await Promise.all([
    prisma.activityMandate.findMany({
      where: { mandateId },
      include: { activity: { include: ACTIVITY_INCLUDE } },
    }),
    prisma.taskMandate.findMany({
      where: { mandateId },
      include: { task: { include: { assignedUser: true } } },
    }),
    prisma.mandateStatusHistory.findMany({
      where: { mandateId },
      include: { changedBy: true },
    }),
    prisma.documentMandate.findMany({
      where: { mandateId },
      include: { document: true },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l) => mapActivity(l.activity, viewerId)),
    ...taskLinks.map((l): TimelineItem => ({
      kind: "task",
      id: l.task.id,
      date: l.task.completedAt ?? l.task.dueDate,
      title: l.task.title,
      status: l.task.status,
      completed: l.task.status === "COMPLETED",
      assigneeName: `${l.task.assignedUser.firstName} ${l.task.assignedUser.lastName}`,
    })),
    ...statusHistory.map((h): TimelineItem => ({
      kind: "stage_change",
      id: h.id,
      date: h.changedAt,
      fromLabel: h.fromStatus,
      toLabel: h.toStatus,
      actorName: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    })),
    ...documentLinks.map((l): TimelineItem => ({
      kind: "file",
      id: l.document.id,
      date: l.document.uploadedAt,
      displayName: l.document.displayName,
      category: l.document.category,
      documentId: l.document.id,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
