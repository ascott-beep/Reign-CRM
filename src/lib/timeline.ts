import "server-only";
import { prisma } from "@/lib/prisma";

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

/** Opportunity-specific for now — extend with mandate/person/org variants as those pages adopt the same timeline. */
export async function getOpportunityTimeline(opportunityId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks, stageHistory, documentLinks] = await Promise.all([
    prisma.activityOpportunity.findMany({
      where: { opportunityId },
      include: { activity: { include: { createdBy: true } } },
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
    ...activityLinks.map((l): TimelineItem => ({
      kind: "activity",
      id: l.activity.id,
      date: l.activity.occurredAt,
      activityType: l.activity.type,
      direction: l.activity.direction,
      outcome: l.activity.outcome,
      subject: l.activity.subject,
      summary: l.activity.summary,
      actorName: `${l.activity.createdBy.firstName} ${l.activity.createdBy.lastName}`,
    })),
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

export async function getPersonTimeline(personId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks] = await Promise.all([
    prisma.activityPerson.findMany({
      where: { personId },
      include: { activity: { include: { createdBy: true } } },
      take: 50,
    }),
    prisma.taskPerson.findMany({
      where: { personId },
      include: { task: { include: { assignedUser: true } } },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l): TimelineItem => ({
      kind: "activity",
      id: l.activity.id,
      date: l.activity.occurredAt,
      activityType: l.activity.type,
      direction: l.activity.direction,
      outcome: l.activity.outcome,
      subject: l.activity.subject,
      summary: l.activity.summary,
      actorName: `${l.activity.createdBy.firstName} ${l.activity.createdBy.lastName}`,
    })),
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

export async function getOrganizationTimeline(organizationId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks] = await Promise.all([
    prisma.activityOrganization.findMany({
      where: { organizationId },
      include: { activity: { include: { createdBy: true } } },
      take: 50,
    }),
    prisma.taskOrganization.findMany({
      where: { organizationId },
      include: { task: { include: { assignedUser: true } } },
    }),
  ]);

  const items: TimelineItem[] = [
    ...activityLinks.map((l): TimelineItem => ({
      kind: "activity",
      id: l.activity.id,
      date: l.activity.occurredAt,
      activityType: l.activity.type,
      direction: l.activity.direction,
      outcome: l.activity.outcome,
      subject: l.activity.subject,
      summary: l.activity.summary,
      actorName: `${l.activity.createdBy.firstName} ${l.activity.createdBy.lastName}`,
    })),
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

export async function getMandateTimeline(mandateId: string): Promise<TimelineItem[]> {
  const [activityLinks, taskLinks, statusHistory, documentLinks] = await Promise.all([
    prisma.activityMandate.findMany({
      where: { mandateId },
      include: { activity: { include: { createdBy: true } } },
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
    ...activityLinks.map((l): TimelineItem => ({
      kind: "activity",
      id: l.activity.id,
      date: l.activity.occurredAt,
      activityType: l.activity.type,
      direction: l.activity.direction,
      outcome: l.activity.outcome,
      subject: l.activity.subject,
      summary: l.activity.summary,
      actorName: `${l.activity.createdBy.firstName} ${l.activity.createdBy.lastName}`,
    })),
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
