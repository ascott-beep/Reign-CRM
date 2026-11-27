import "server-only";
import { prisma } from "@/lib/prisma";
import { OPEN_OPPORTUNITY_STAGES } from "@/lib/rules";
import { baseUrl } from "@/lib/base-url";
import type { MailboxConnection } from "@prisma/client";
import * as graph from "@/lib/graph-client";
import * as gmail from "@/lib/gmail-client";

/** Reign Partners' own domain — section 7 "Never sync emails that are only between @reign.partners addresses." Single-tenant app; the same literal is already used in src/lib/email.ts. */
const INTERNAL_EMAIL_DOMAIN = "reign.partners";

/**
 * Section 7 "Use change notifications (Graph subscriptions, Gmail push)
 * with a 5-minute polling fallback." Microsoft needs nothing beyond the
 * app itself, so this always tries; Gmail watch needs a Google Cloud
 * Pub/Sub topic, so it only runs once GMAIL_PUBSUB_TOPIC is set — until
 * then Gmail relies on the polling fallback alone. Safe to call
 * repeatedly (renews before the ~2-day Graph expiry; re-subscribes if a
 * previous attempt never succeeded).
 */
export async function ensureChangeNotifications(connection: MailboxConnection) {
  if (connection.provider === "MICROSOFT") {
    const needsRenewal = !connection.graphSubscriptionId || !connection.graphSubscriptionExpiresAt || connection.graphSubscriptionExpiresAt.getTime() - 12 * 60 * 60 * 1000 < Date.now();
    if (!needsRenewal) return;
    try {
      const subscription = await graph.createMailSubscription(connection, `${baseUrl()}/api/webhooks/microsoft-graph`, connection.id);
      await prisma.mailboxConnection.update({
        where: { id: connection.id },
        data: { graphSubscriptionId: subscription.id, graphSubscriptionExpiresAt: new Date(subscription.expirationDateTime) },
      });
    } catch {
      // Not fatal — the polling cron still covers this mailbox every 5 minutes.
    }
    return;
  }

  if (connection.provider === "GOOGLE" && process.env.GMAIL_PUBSUB_TOPIC) {
    try {
      await gmail.watchMailbox(connection, process.env.GMAIL_PUBSUB_TOPIC);
    } catch {
      // Not fatal — same polling fallback applies.
    }
  }
}

function isInternal(address: string) {
  return address.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

async function findMatchedPersonIds(workspaceId: string, addresses: string[]): Promise<string[]> {
  const lower = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))];
  if (lower.length === 0) return [];
  const people = await prisma.person.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      OR: [{ primaryEmail: { in: lower, mode: "insensitive" } }, { secondaryEmail: { in: lower, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  return people.map((p) => p.id);
}

async function findNeverSyncAddresses(userId: string): Promise<Set<string>> {
  const rows = await prisma.neverSyncAddress.findMany({ where: { userId }, select: { emailAddress: true } });
  return new Set(rows.map((r) => r.emailAddress.toLowerCase()));
}

type PersonLinks = { organizationId: string | null; opportunityIds: string[]; mandateIds: string[] };

/** Section 7 "Where a synced email shows: that person's history, their current company's history, and any open opportunity or mandate where they're a contact or candidate." */
async function linksForPerson(workspaceId: string, personId: string): Promise<PersonLinks> {
  const person = await prisma.person.findUniqueOrThrow({
    where: { id: personId },
    select: {
      currentOrganizationOverrideId: true,
      organizationAssociations: { take: 1, select: { organizationId: true } },
      employmentHistories: { take: 1, orderBy: { startDate: "desc" }, select: { organizationId: true } },
    },
  });
  const organizationId = person.currentOrganizationOverrideId ?? person.organizationAssociations[0]?.organizationId ?? person.employmentHistories[0]?.organizationId ?? null;

  const [openOpportunities, openMandatesDirect, openProcesses] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId, archivedAt: null, stage: { in: OPEN_OPPORTUNITY_STAGES }, OR: [{ leadContactPersonId: personId }, { stakeholders: { some: { personId } } }] },
      select: { id: true },
    }),
    prisma.mandate.findMany({
      where: { workspaceId, archivedAt: null, status: { notIn: ["FILLED", "CANCELLED"] }, OR: [{ hiringManagerPersonId: personId }, { stakeholders: { some: { personId } } }] },
      select: { id: true },
    }),
    prisma.candidateProcess.findMany({
      where: { workspaceId, candidatePersonId: personId, stage: { notIn: ["PLACED", "REJECTED", "WITHDRAWN"] } },
      select: { mandateId: true },
    }),
  ]);

  const mandateIds = new Set([...openMandatesDirect.map((m) => m.id), ...openProcesses.map((p) => p.mandateId)]);
  return { organizationId, opportunityIds: openOpportunities.map((o) => o.id), mandateIds: [...mandateIds] };
}

function linkCreateInput(matchedPersonIds: string[], links: PersonLinks[]) {
  const organizationIds = new Set(links.map((l) => l.organizationId).filter((id): id is string => Boolean(id)));
  const opportunityIds = new Set(links.flatMap((l) => l.opportunityIds));
  const mandateIds = new Set(links.flatMap((l) => l.mandateIds));
  return {
    people: { create: matchedPersonIds.map((personId) => ({ personId })) },
    organizations: { create: [...organizationIds].map((organizationId) => ({ organizationId })) },
    opportunities: { create: [...opportunityIds].map((opportunityId) => ({ opportunityId })) },
    mandates: { create: [...mandateIds].map((mandateId) => ({ mandateId })) },
  };
}

type RawEmail = {
  messageId: string;
  subject: string | null;
  bodyText: string;
  from: string;
  to: string[];
  cc: string[];
  occurredAt: Date;
};

function normalizeGraphMessage(m: graph.GraphMessage): RawEmail {
  return {
    messageId: m.internetMessageId,
    subject: m.subject,
    bodyText: m.body?.content ?? m.bodyPreview ?? "",
    from: m.from?.emailAddress?.address ?? "",
    to: (m.toRecipients ?? []).map((r) => r.emailAddress?.address ?? "").filter(Boolean),
    cc: (m.ccRecipients ?? []).map((r) => r.emailAddress?.address ?? "").filter(Boolean),
    occurredAt: new Date(m.sentDateTime ?? m.receivedDateTime),
  };
}

function normalizeGmailMessage(m: gmail.NormalizedEmail): RawEmail {
  return { messageId: m.messageId, subject: m.subject, bodyText: m.bodyText, from: m.from ?? "", to: m.to, cc: m.cc, occurredAt: m.date };
}

/** One connection's email sync: fetch what changed, keep only matched/non-internal/not-never-synced mail, upsert as EMAIL activities (idempotent on externalMessageId). */
export async function syncMailboxEmail(connection: MailboxConnection, workspaceId: string) {
  if (!connection.emailSyncEnabled) return { synced: 0 };

  const { messages, nextCursor } =
    connection.provider === "MICROSOFT" ? await graph.listMessagesDelta(connection) : await gmail.listMessagesDelta(connection);
  const normalized = connection.provider === "MICROSOFT" ? (messages as graph.GraphMessage[]).map(normalizeGraphMessage) : (messages as gmail.NormalizedEmail[]).map(normalizeGmailMessage);
  const neverSync = await findNeverSyncAddresses(connection.userId);

  let synced = 0;
  for (const email of normalized) {
    const allAddresses = [email.from, ...email.to, ...email.cc].filter(Boolean);
    if (!email.messageId || allAddresses.length === 0) continue;
    if (allAddresses.every(isInternal)) continue;
    if (allAddresses.some((a) => neverSync.has(a.toLowerCase()))) continue;

    const matchedPersonIds = await findMatchedPersonIds(workspaceId, allAddresses);
    if (matchedPersonIds.length === 0) continue;

    const existing = await prisma.activity.findUnique({ where: { externalMessageId: email.messageId } });
    if (existing) continue;

    const links = await Promise.all(matchedPersonIds.map((id) => linksForPerson(workspaceId, id)));
    await prisma.activity.create({
      data: {
        workspaceId,
        type: "EMAIL",
        direction: isInternal(email.from) ? "OUTBOUND" : "INBOUND",
        subject: email.subject,
        occurredAt: email.occurredAt,
        summary: email.bodyText.slice(0, 2000),
        fullNotes: email.bodyText,
        externalMessageId: email.messageId,
        createdById: connection.userId,
        assignedOwnerId: connection.userId,
        ...linkCreateInput(matchedPersonIds, links),
      },
    });
    synced += 1;
  }

  await prisma.mailboxConnection.update({ where: { id: connection.id }, data: { emailSyncCursor: nextCursor || connection.emailSyncCursor, lastEmailSyncAt: new Date(), status: "ACTIVE", lastErrorMessage: null } });
  return { synced };
}

type RawEvent = { externalId: string; subject: string | null; attendeeEmails: string[]; start: Date; end: Date };

function normalizeGraphEvent(e: graph.GraphEvent): RawEvent {
  return {
    externalId: e.iCalUId,
    subject: e.subject,
    attendeeEmails: (e.attendees ?? []).map((a) => a.emailAddress?.address?.toLowerCase() ?? "").filter(Boolean),
    start: new Date(e.start.dateTime),
    end: new Date(e.end.dateTime),
  };
}

function normalizeGmailEvent(e: gmail.NormalizedEvent): RawEvent {
  return { externalId: e.id, subject: e.subject, attendeeEmails: e.attendeeEmails, start: e.start, end: e.end };
}

/** Section 7 "Calendar: meetings with matched people log themselves as Meeting activities, which feeds the status dots." */
export async function syncMailboxCalendar(connection: MailboxConnection, workspaceId: string) {
  if (!connection.calendarSyncEnabled) return { synced: 0 };

  const { events, nextCursor } =
    connection.provider === "MICROSOFT" ? await graph.listCalendarEventsDelta(connection) : await gmail.listCalendarEventsDelta(connection);
  const normalized = connection.provider === "MICROSOFT" ? (events as graph.GraphEvent[]).map(normalizeGraphEvent) : (events as gmail.NormalizedEvent[]).map(normalizeGmailEvent);

  let synced = 0;
  for (const event of normalized) {
    const externalMessageId = `calendar:${connection.id}:${event.externalId}`;
    const matchedPersonIds = await findMatchedPersonIds(workspaceId, event.attendeeEmails);
    if (matchedPersonIds.length === 0) continue;

    const existing = await prisma.activity.findUnique({ where: { externalMessageId } });
    if (existing) continue;

    const links = await Promise.all(matchedPersonIds.map((id) => linksForPerson(workspaceId, id)));
    await prisma.activity.create({
      data: {
        workspaceId,
        type: "MEETING",
        direction: "NOT_APPLICABLE",
        subject: event.subject,
        occurredAt: event.start,
        durationMinutes: Math.round((event.end.getTime() - event.start.getTime()) / 60000),
        externalMessageId,
        createdById: connection.userId,
        assignedOwnerId: connection.userId,
        ...linkCreateInput(matchedPersonIds, links),
      },
    });
    synced += 1;
  }

  await prisma.mailboxConnection.update({ where: { id: connection.id }, data: { calendarSyncCursor: nextCursor || connection.calendarSyncCursor, lastCalendarSyncAt: new Date(), status: "ACTIVE", lastErrorMessage: null } });
  return { synced };
}

/** The polling fallback (and webhook handlers) call this for one connection; errors are recorded on the connection rather than thrown, so one broken mailbox doesn't stop the batch. */
export async function syncMailboxConnection(connectionId: string) {
  const connection = await prisma.mailboxConnection.findUniqueOrThrow({ where: { id: connectionId }, include: { user: { select: { workspaceId: true } } } });
  if (connection.status === "DISCONNECTED") return;

  try {
    const emailResult = await syncMailboxEmail(connection, connection.user.workspaceId);
    const calendarResult = await syncMailboxCalendar(connection, connection.user.workspaceId);
    return { emailSynced: emailResult.synced, calendarSynced: calendarResult.synced };
  } catch (error) {
    await prisma.mailboxConnection.update({
      where: { id: connectionId },
      data: { status: "ERROR", lastErrorMessage: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
