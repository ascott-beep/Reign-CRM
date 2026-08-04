import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * Saved views store a small, explicitly-validated filter JSON shape (never
 * arbitrary query fragments — see spec 6.24). This module turns that JSON
 * into Prisma `where` clauses for each entity type. Unknown keys are
 * ignored rather than throwing, so views degrade gracefully.
 */

const STALE_DAYS = 60;

export function organizationViewWhere(filter: Record<string, unknown>, currentUserId: string): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {};
  if (typeof filter.type === "string") where.type = filter.type as any;
  if (typeof filter.accountPriority === "string") where.accountPriority = filter.accountPriority as any;
  if (filter.hasInvestor === false) where.relationshipsAsTarget = { none: { archivedAt: null } };
  if (filter.hasCurrentPortfolio === true) where.relationshipsAsSource = { some: { archivedAt: null, investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } } };
  if (filter.hasStakeholder === false) where.personAssociations = { none: {} };
  if (filter.hasNextTask === false) {
    where.tasks = { none: { task: { status: { in: ["TODO", "IN_PROGRESS"] }, archivedAt: null } } };
  }
  if (filter.stale === true) {
    const threshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    where.OR = [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: threshold } }];
  }
  void currentUserId;
  return where;
}

export function personViewWhere(filter: Record<string, unknown>, currentUserId: string): Prisma.PersonWhereInput {
  const where: Prisma.PersonWhereInput = {};
  if (typeof filter.personType === "string") where.personTypes = { has: filter.personType as any };
  if (Array.isArray(filter.personTypeIn)) where.personTypes = { hasSome: filter.personTypeIn as any[] };
  if (typeof filter.candidateStatus === "string") where.candidateProfile = { status: filter.candidateStatus as any };
  if (filter.noCurrentEmployment === true) {
    where.candidateProfile = { isNot: null };
    where.employmentHistories = { none: { isCurrent: true } };
  }
  if (filter.needsFollowUp === true) {
    where.tasks = { none: { task: { status: { in: ["TODO", "IN_PROGRESS"] }, archivedAt: null } } };
  }
  if (typeof filter.stakeholderRole === "string") {
    where.organizationAssociations = { some: { stakeholderRoles: { has: filter.stakeholderRole as any } } };
  }
  if (filter.doNotContact === true) where.doNotContact = true;
  void currentUserId;
  return where;
}

export function opportunityViewWhere(filter: Record<string, unknown>, currentUserId: string): Prisma.OpportunityWhereInput {
  const where: Prisma.OpportunityWhereInput = {};
  if (Array.isArray(filter.excludeStages)) where.stage = { notIn: filter.excludeStages as any[] };
  if (typeof filter.stage === "string") where.stage = filter.stage as any;
  if (filter.ownerId === "$currentUser") where.ownerId = currentUserId;
  if (filter.hasNextTask === false) where.primaryNextTaskId = null;
  if (filter.stale === true) {
    const threshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    where.updatedAt = { lt: threshold };
    where.stage = { notIn: ["WON", "LOST"] };
  }
  if (filter.expectedDecisionThisMonth === true) {
    const now = new Date();
    where.expectedDecisionDate = { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  return where;
}

export function mandateViewWhere(filter: Record<string, unknown>, currentUserId: string): Prisma.MandateWhereInput {
  const where: Prisma.MandateWhereInput = {};
  if (Array.isArray(filter.excludeStatuses)) where.status = { notIn: filter.excludeStatuses as any[] };
  if (typeof filter.status === "string") where.status = filter.status as any;
  if (filter.ownerId === "$currentUser") where.ownerId = currentUserId;
  if (Array.isArray(filter.confidentiality)) where.confidentiality = { in: filter.confidentiality as any[] };
  if (filter.overdueShortlist === true) {
    where.targetShortlistDate = { lt: new Date() };
    where.status = { notIn: ["FILLED", "CANCELLED"] };
  }
  if (filter.filledThisQuarter === true) {
    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    where.filledDate = { gte: new Date(now.getFullYear(), quarterStartMonth, 1) };
  }
  return where;
}

export function taskViewWhere(filter: Record<string, unknown>, currentUserId: string): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  if (filter.due === "today") where.dueDate = { gte: startOfToday, lt: endOfToday };
  if (filter.due === "overdue") where.dueDate = { lt: startOfToday };
  if (filter.due === "next7days") where.dueDate = { gte: startOfToday, lt: new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000) };
  if (typeof filter.status === "string") where.status = filter.status as any;
  if (filter.completedThisWeek === true) {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfToday.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
    where.status = "COMPLETED";
    where.completedAt = { gte: startOfWeek };
  }
  void currentUserId;
  return where;
}

export function intelligenceViewWhere(filter: Record<string, unknown>): Prisma.IntelligenceItemWhereInput {
  const where: Prisma.IntelligenceItemWhereInput = {};
  if (Array.isArray(filter.commercialRelevance)) where.commercialRelevance = { in: filter.commercialRelevance as any[] };
  if (typeof filter.confidence === "string") where.confidence = filter.confidence as any;
  if (filter.followUpRequired === true) where.followUpRequired = true;
  if (filter.converted === true) where.convertedOpportunityId = { not: null };
  return where;
}
