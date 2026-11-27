import "server-only";
import { getValidAccessToken } from "@/lib/mailbox-token";
import type { MailboxConnection } from "@prisma/client";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary";

async function gmailFetch(connection: MailboxConnection, path: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken(connection);
  const res = await fetch(`${path.startsWith("http") ? path : `${GMAIL_BASE}${path}`}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail API ${path} failed (${res.status}): ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

type GmailHeader = { name: string; value: string };
type GmailPart = { mimeType: string; body?: { data?: string }; parts?: GmailPart[] };

export type NormalizedEmail = {
  id: string;
  messageId: string;
  subject: string | null;
  from: string | null;
  to: string[];
  cc: string[];
  bodyText: string;
  date: Date;
};

function headerValue(headers: GmailHeader[], name: string): string | null {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function extractAddresses(headerVal: string | null): string[] {
  if (!headerVal) return [];
  // "Name <addr@x.com>, addr2@y.com" -> ["addr@x.com", "addr2@y.com"]
  return headerVal
    .split(",")
    .map((s) => s.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? s.trim().toLowerCase())
    .filter(Boolean);
}

function findTextPart(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
  for (const child of part.parts ?? []) {
    const found = findTextPart(child);
    if (found) return found;
  }
  return "";
}

function normalize(raw: { id: string; snippet?: string; payload?: { headers?: GmailHeader[] } & GmailPart; internalDate?: string }): NormalizedEmail {
  const headers = raw.payload?.headers ?? [];
  return {
    id: raw.id,
    messageId: headerValue(headers, "Message-Id") ?? raw.id,
    subject: headerValue(headers, "Subject"),
    from: extractAddresses(headerValue(headers, "From"))[0] ?? null,
    to: extractAddresses(headerValue(headers, "To")),
    cc: extractAddresses(headerValue(headers, "Cc")),
    bodyText: findTextPart(raw.payload) || raw.snippet || "",
    date: raw.internalDate ? new Date(Number(raw.internalDate)) : new Date(),
  };
}

/** First sync (no cursor): recent inbox+sent mail. Later syncs: Gmail's history API, scoped to what changed since the stored historyId. */
export async function listMessagesDelta(connection: MailboxConnection): Promise<{ messages: NormalizedEmail[]; nextCursor: string }> {
  let messageIds: string[] = [];
  let nextCursor = connection.emailSyncCursor ?? "";

  if (!connection.emailSyncCursor) {
    const list = await gmailFetch(connection, "/messages?maxResults=50&q=newer_than:30d");
    messageIds = (list?.messages ?? []).map((m: { id: string }) => m.id);
    const profile = await gmailFetch(connection, "/profile");
    nextCursor = String(profile?.historyId ?? "");
  } else {
    try {
      const history = await gmailFetch(connection, `/history?startHistoryId=${connection.emailSyncCursor}&historyTypes=messageAdded`);
      const seen = new Set<string>();
      for (const h of history?.history ?? []) {
        for (const added of h.messagesAdded ?? []) {
          if (!seen.has(added.message.id)) {
            seen.add(added.message.id);
            messageIds.push(added.message.id);
          }
        }
      }
      nextCursor = String(history?.historyId ?? connection.emailSyncCursor);
    } catch {
      // historyId too old (Gmail purges after ~30 days) — fall back to a fresh short window instead of failing the sync.
      const list = await gmailFetch(connection, "/messages?maxResults=50&q=newer_than:1d");
      messageIds = (list?.messages ?? []).map((m: { id: string }) => m.id);
      const profile = await gmailFetch(connection, "/profile");
      nextCursor = String(profile?.historyId ?? connection.emailSyncCursor);
    }
  }

  const messages: NormalizedEmail[] = [];
  for (const id of messageIds) {
    const full = await gmailFetch(connection, `/messages/${id}?format=full`);
    messages.push(normalize(full));
  }
  return { messages, nextCursor };
}

export async function sendMail(connection: MailboxConnection, input: { to: string; subject: string; body: string; inReplyToMessageId?: string }): Promise<string> {
  const lines = [`To: ${input.to}`, `Subject: ${input.subject}`, "Content-Type: text/plain; charset=utf-8", ""];
  if (input.inReplyToMessageId) lines.splice(2, 0, `In-Reply-To: ${input.inReplyToMessageId}`, `References: ${input.inReplyToMessageId}`);
  const raw = Buffer.from([...lines, input.body].join("\r\n")).toString("base64url");
  const sent = await gmailFetch(connection, "/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
  const full = await gmailFetch(connection, `/messages/${sent.id}?format=metadata&metadataHeaders=Message-Id`);
  return headerValue(full?.payload?.headers ?? [], "Message-Id") ?? sent.id;
}

/** Gmail push needs a Google Cloud Pub/Sub topic that grants gmail-api-push@system.gserviceaccount.com publish rights — see the wrap-up notes. Falls back to polling until that's set up. */
export async function watchMailbox(connection: MailboxConnection, topicName: string) {
  return gmailFetch(connection, "/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicName, labelIds: ["INBOX"] }) });
}

export type NormalizedEvent = {
  id: string;
  subject: string | null;
  attendeeEmails: string[];
  start: Date;
  end: Date;
};

export async function listCalendarEventsDelta(connection: MailboxConnection): Promise<{ events: NormalizedEvent[]; nextCursor: string }> {
  let url = connection.calendarSyncCursor
    ? `${CALENDAR_BASE}/events?syncToken=${connection.calendarSyncCursor}`
    : `${CALENDAR_BASE}/events?timeMin=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&timeMax=${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`;
  const events: NormalizedEvent[] = [];
  let nextCursor = connection.calendarSyncCursor ?? "";

  for (let i = 0; i < 20; i++) {
    let json;
    try {
      json = await gmailFetch(connection, url);
    } catch {
      // syncToken expired — restart from a fresh window rather than failing.
      json = await gmailFetch(
        connection,
        `${CALENDAR_BASE}/events?timeMin=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&timeMax=${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`,
      );
    }
    for (const e of json.items ?? []) {
      if (!e.start?.dateTime || !e.end?.dateTime) continue; // skip all-day events, no useful meeting time
      events.push({
        id: e.id,
        subject: e.summary ?? null,
        attendeeEmails: (e.attendees ?? []).map((a: { email: string }) => a.email.toLowerCase()),
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
      });
    }
    if (json.nextPageToken) {
      url = `${CALENDAR_BASE}/events?pageToken=${json.nextPageToken}`;
      continue;
    }
    nextCursor = json.nextSyncToken ?? nextCursor;
    break;
  }

  return { events, nextCursor };
}
