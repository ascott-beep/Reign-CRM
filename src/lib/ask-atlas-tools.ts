import "server-only";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { mandateVisibilityWhere, type SessionUser } from "@/lib/permissions";
import { OPEN_OPPORTUNITY_STAGES, LIVE_MANDATE_STATUSES } from "@/lib/rules";
import { label } from "@/lib/labels";
import type { Prisma } from "@prisma/client";

/**
 * Round 2 section 8 — read-only tools the Ask Atlas agent can call. Every
 * tool is scoped to the asking user's workspace and respects the same
 * permission rules the rest of the app uses (mandateVisibilityWhere for
 * confidential mandates). Candidate-facing tools always exclude people
 * marked do-not-contact — the brief only requires this for "candidate
 * suggestions", but excluding them everywhere Ask Atlas looks is the
 * safer reading and simpler to get right.
 */

async function searchPeople(
  user: SessionUser,
  args: { query?: string; sector?: string; onlyCandidates?: boolean; peBackedOnly?: boolean; activeWithinDays?: number },
) {
  const where: Prisma.PersonWhereInput = { workspaceId: user.workspaceId, archivedAt: null, doNotContact: false };
  if (args.onlyCandidates) where.personTypes = { has: "CANDIDATE" };
  if (args.query) {
    where.OR = [
      { firstName: { contains: args.query, mode: "insensitive" } },
      { lastName: { contains: args.query, mode: "insensitive" } },
      { headlineOverride: { contains: args.query, mode: "insensitive" } },
      { primaryEmail: { contains: args.query, mode: "insensitive" } },
      { employmentHistories: { some: { jobTitle: { contains: args.query, mode: "insensitive" } } } },
    ];
  }
  if (args.sector || args.peBackedOnly) {
    where.employmentHistories = {
      some: {
        organization: {
          ...(args.sector ? { sectors: { some: { sector: { name: { contains: args.sector, mode: "insensitive" } } } } } : {}),
          ...(args.peBackedOnly ? { relationshipsAsTarget: { some: { investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] }, sourceOrganization: { type: "PE_FUND" } } } } : {}),
        },
      },
    };
  }
  if (args.activeWithinDays) {
    const recent = await prisma.activityPerson.findMany({
      where: { activity: { workspaceId: user.workspaceId, occurredAt: { gte: subDays(new Date(), args.activeWithinDays) } } },
      select: { personId: true },
      distinct: ["personId"],
    });
    where.id = { in: recent.map((r) => r.personId) };
  }

  const people = await prisma.person.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      headlineOverride: true,
      personTypes: true,
      candidateProfile: { select: { rating: true, peBackedExperienceSummary: true } },
      employmentHistories: { where: { isCurrent: true }, take: 1, select: { jobTitle: true, organization: { select: { name: true } } } },
    },
    take: 20,
  });

  return people.map((p) => ({
    type: "person",
    id: p.id,
    href: `/people/${p.id}`,
    name: `${p.firstName} ${p.lastName}`,
    currentRole: p.employmentHistories[0] ? `${p.employmentHistories[0].jobTitle} at ${p.employmentHistories[0].organization?.name ?? "unknown company"}` : (p.headlineOverride ?? null),
    isCandidate: p.personTypes.includes("CANDIDATE"),
    candidateRating: p.candidateProfile ? label(p.candidateProfile.rating) : null,
    peBackedExperienceSummary: p.candidateProfile?.peBackedExperienceSummary ?? null,
  }));
}

async function searchOrganizations(user: SessionUser, args: { query?: string; sector?: string }) {
  const where: Prisma.OrganizationWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (args.query) where.name = { contains: args.query, mode: "insensitive" };
  if (args.sector) where.sectors = { some: { sector: { name: { contains: args.sector, mode: "insensitive" } } } };

  const orgs = await prisma.organization.findMany({
    where,
    select: { id: true, name: true, type: true, relationshipsAsTarget: { where: { investmentStatus: { in: ["CURRENT", "ANNOUNCED"] } }, select: { sourceOrganization: { select: { name: true } } }, take: 1 } },
    take: 20,
  });

  return orgs.map((o) => ({
    type: "organization",
    id: o.id,
    href: `/organisations/${o.id}`,
    name: o.name,
    orgType: label(o.type),
    peOwner: o.relationshipsAsTarget[0]?.sourceOrganization.name ?? null,
  }));
}

async function searchOpportunities(user: SessionUser, args: { query?: string; openOnly?: boolean }) {
  const where: Prisma.OpportunityWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (args.openOnly) where.stage = { in: OPEN_OPPORTUNITY_STAGES };
  if (args.query) where.OR = [{ name: { contains: args.query, mode: "insensitive" } }, { potentialRoleTitle: { contains: args.query, mode: "insensitive" } }];

  const rows = await prisma.opportunity.findMany({
    where,
    select: { id: true, name: true, stage: true, hiringOrganization: { select: { name: true } } },
    take: 20,
  });
  return rows.map((o) => ({ type: "opportunity", id: o.id, href: `/opportunities/${o.id}`, name: o.name, company: o.hiringOrganization.name, stage: label(o.stage) }));
}

async function searchMandates(user: SessionUser, args: { query?: string; liveOnly?: boolean }) {
  const where: Prisma.MandateWhereInput = { workspaceId: user.workspaceId, archivedAt: null, AND: [mandateVisibilityWhere(user)] };
  if (args.liveOnly) where.status = { in: [...LIVE_MANDATE_STATUSES] };
  if (args.query) where.OR = [{ title: { contains: args.query, mode: "insensitive" } }, { reference: { contains: args.query, mode: "insensitive" } }];

  const rows = await prisma.mandate.findMany({
    where,
    select: { id: true, title: true, status: true, hiringOrganization: { select: { name: true } } },
    take: 20,
  });
  return rows.map((m) => ({ type: "mandate", id: m.id, href: `/mandates/${m.id}`, name: m.title, company: m.hiringOrganization.name, status: label(m.status) }));
}

/** "Who's interviewing for X and what's outstanding?" — candidates in a mandate's pipeline, with their stage and next interview. */
async function searchCandidateProcesses(user: SessionUser, args: { mandateQuery?: string; stage?: string }) {
  const where: Prisma.CandidateProcessWhereInput = {
    workspaceId: user.workspaceId,
    mandate: { AND: [mandateVisibilityWhere(user)], ...(args.mandateQuery ? { title: { contains: args.mandateQuery, mode: "insensitive" } } : {}) },
    candidatePerson: { doNotContact: false },
  };
  if (args.stage) where.stage = args.stage as Prisma.EnumCandidateProcessStageFilter["equals"];

  const rows = await prisma.candidateProcess.findMany({
    where,
    select: {
      id: true,
      stage: true,
      mandate: { select: { id: true, title: true } },
      candidatePerson: { select: { id: true, firstName: true, lastName: true } },
      interviews: { where: { scheduledStart: { gte: new Date() } }, orderBy: { scheduledStart: "asc" }, take: 1, select: { scheduledStart: true, type: true } },
    },
    take: 30,
  });

  return rows.map((p) => ({
    type: "candidateProcess",
    id: p.id,
    href: `/mandates/${p.mandate.id}`,
    candidateName: `${p.candidatePerson.firstName} ${p.candidatePerson.lastName}`,
    candidateHref: `/people/${p.candidatePerson.id}`,
    mandateTitle: p.mandate.title,
    stage: label(p.stage),
    nextInterview: p.interviews[0] ? `${label(p.interviews[0].type)} on ${p.interviews[0].scheduledStart.toISOString().slice(0, 10)}` : null,
  }));
}

/** Notes/calls/meetings/emails — "what's the latest", "who have we spoken to". */
async function searchActivitiesAndNotes(user: SessionUser, args: { query?: string; personQuery?: string; withinDays?: number }) {
  const where: Prisma.ActivityWhereInput = { workspaceId: user.workspaceId };
  if (args.withinDays) where.occurredAt = { gte: subDays(new Date(), args.withinDays) };
  if (args.query) where.OR = [{ subject: { contains: args.query, mode: "insensitive" } }, { summary: { contains: args.query, mode: "insensitive" } }];
  if (args.personQuery) {
    where.people = { some: { person: { OR: [{ firstName: { contains: args.personQuery, mode: "insensitive" } }, { lastName: { contains: args.personQuery, mode: "insensitive" } }] } } };
  }

  const rows = await prisma.activity.findMany({
    where,
    select: { id: true, type: true, subject: true, summary: true, private: true, occurredAt: true, people: { select: { person: { select: { id: true, firstName: true, lastName: true } } } } },
    orderBy: { occurredAt: "desc" },
    take: 25,
  });

  return rows.map((a) => ({
    type: "activity",
    id: a.id,
    activityType: label(a.type),
    date: a.occurredAt.toISOString().slice(0, 10),
    subject: a.private ? null : a.subject,
    summary: a.private ? "(private · content hidden)" : a.summary,
    people: a.people.map((p) => ({ id: p.person.id, href: `/people/${p.person.id}`, name: `${p.person.firstName} ${p.person.lastName}` })),
  }));
}

export const ASK_ATLAS_TOOL_DEFINITIONS = [
  {
    name: "search_people",
    description: "Search people (contacts and candidates) in Atlas. Never returns people marked do-not-contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name, email, headline or job title to match." },
        sector: { type: "string", description: "Filter to people whose current employer is in this sector, e.g. \"logistics\"." },
        onlyCandidates: { type: "boolean", description: "Only people tagged as a candidate." },
        peBackedOnly: { type: "boolean", description: "Only people whose current employer is PE-backed." },
        activeWithinDays: { type: "number", description: "Only people with a logged activity (call, email, meeting) in the last N days." },
      },
    },
  },
  {
    name: "search_organizations",
    description: "Search companies and PE funds in Atlas.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, sector: { type: "string" } } },
  },
  {
    name: "search_opportunities",
    description: "Search possible-work opportunities (before they become a confirmed mandate).",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, openOnly: { type: "boolean", description: "Only opportunities not yet won or lost." } } },
  },
  {
    name: "search_mandates",
    description: "Search confirmed search mandates (live roles being worked).",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, liveOnly: { type: "boolean", description: "Only mandates still open (not filled/cancelled)." } } },
  },
  {
    name: "search_candidate_processes",
    description: "Who is in the candidate pipeline for a mandate, their stage, and their next interview if one is scheduled.",
    input_schema: { type: "object" as const, properties: { mandateQuery: { type: "string", description: "Mandate title to match, e.g. \"Bracken\"." }, stage: { type: "string" } } },
  },
  {
    name: "search_activities_notes",
    description: "Search logged calls, meetings, emails and notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Text to match in the subject or summary." },
        personQuery: { type: "string", description: "Only activity involving a person matching this name." },
        withinDays: { type: "number", description: "Only activity from the last N days." },
      },
    },
  },
];

export type RecordRefSummary = { type: "person" | "organization" | "opportunity" | "mandate"; id: string; label: string; meta: string; tag: string | null; href: string };

/**
 * Round 4 screen 02 "Supporting records appear as rows below the text, with
 * status tags matching the rest of Atlas" -- looks up a one-line meta and a
 * status tag for each record Ask Atlas named, scoped to the asking user's
 * workspace and visibility (confidential mandates excluded the same way
 * every mandate query in this file already is).
 */
export async function summariseRecordRefs(
  user: SessionUser,
  refs: { type: "person" | "organization" | "opportunity" | "mandate"; id: string; label: string }[],
): Promise<RecordRefSummary[]> {
  const ids = (type: string) => refs.filter((r) => r.type === type).map((r) => r.id);

  const [people, organizations, opportunities, mandates] = await Promise.all([
    ids("person").length
      ? prisma.person.findMany({
          where: { id: { in: ids("person") }, workspaceId: user.workspaceId },
          select: { id: true, headlineOverride: true, employmentHistories: { where: { isCurrent: true }, take: 1, select: { jobTitle: true } }, candidateProfile: { select: { status: true } } },
        })
      : Promise.resolve([]),
    ids("organization").length
      ? prisma.organization.findMany({ where: { id: { in: ids("organization") }, workspaceId: user.workspaceId }, select: { id: true, type: true, status: true } })
      : Promise.resolve([]),
    ids("opportunity").length
      ? prisma.opportunity.findMany({
          where: { id: { in: ids("opportunity") }, workspaceId: user.workspaceId },
          select: { id: true, stage: true, hiringOrganization: { select: { name: true } } },
        })
      : Promise.resolve([]),
    ids("mandate").length
      ? prisma.mandate.findMany({
          where: { id: { in: ids("mandate") }, workspaceId: user.workspaceId, ...mandateVisibilityWhere(user) },
          select: { id: true, status: true, hiringOrganization: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const personById = new Map(people.map((p) => [p.id, p]));
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  const oppById = new Map(opportunities.map((o) => [o.id, o]));
  const mandateById = new Map(mandates.map((m) => [m.id, m]));

  const basePath: Record<string, string> = { person: "/people", organization: "/organisations", opportunity: "/opportunities", mandate: "/mandates" };

  return refs.flatMap((ref): RecordRefSummary[] => {
    if (ref.type === "person") {
      const p = personById.get(ref.id);
      if (!p) return [];
      const title = p.headlineOverride?.split(",")[0] ?? p.employmentHistories[0]?.jobTitle ?? "";
      return [{ type: "person", id: ref.id, label: ref.label, meta: title, tag: p.candidateProfile ? label(p.candidateProfile.status) : null, href: `${basePath.person}/${ref.id}` }];
    }
    if (ref.type === "organization") {
      const o = orgById.get(ref.id);
      if (!o) return [];
      return [{ type: "organization", id: ref.id, label: ref.label, meta: label(o.type), tag: label(o.status), href: `${basePath.organization}/${ref.id}` }];
    }
    if (ref.type === "opportunity") {
      const o = oppById.get(ref.id);
      if (!o) return [];
      return [{ type: "opportunity", id: ref.id, label: ref.label, meta: o.hiringOrganization.name, tag: label(o.stage), href: `${basePath.opportunity}/${ref.id}` }];
    }
    const m = mandateById.get(ref.id);
    if (!m) return [];
    return [{ type: "mandate", id: ref.id, label: ref.label, meta: m.hiringOrganization.name, tag: label(m.status), href: `${basePath.mandate}/${ref.id}` }];
  });
}

export async function runAskAtlasTool(name: string, input: Record<string, unknown>, user: SessionUser): Promise<unknown> {
  switch (name) {
    case "search_people":
      return searchPeople(user, input);
    case "search_organizations":
      return searchOrganizations(user, input);
    case "search_opportunities":
      return searchOpportunities(user, input);
    case "search_mandates":
      return searchMandates(user, input);
    case "search_candidate_processes":
      return searchCandidateProcesses(user, input);
    case "search_activities_notes":
      return searchActivitiesAndNotes(user, input);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
