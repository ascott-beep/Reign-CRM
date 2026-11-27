import "server-only";
import { getValidAccessToken } from "@/lib/mailbox-token";
import type { MailboxConnection } from "@prisma/client";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphFetch(connection: MailboxConnection, path: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken(connection);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Microsoft Graph ${path} failed (${res.status}): ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export type GraphMessage = {
  id: string;
  internetMessageId: string;
  subject: string | null;
  bodyPreview: string | null;
  body?: { content: string; contentType: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string; name?: string } }[];
  ccRecipients?: { emailAddress?: { address?: string; name?: string } }[];
  sentDateTime: string;
  receivedDateTime: string;
};

/** Round 2 section 7 polling fallback + webhook-triggered catch-up — delta query picks up only what changed since the stored cursor. */
export async function listMessagesDelta(connection: MailboxConnection): Promise<{ messages: GraphMessage[]; nextCursor: string }> {
  const path = connection.emailSyncCursor ?? "/me/mailFolders/inbox/messages/delta?$select=subject,bodyPreview,body,from,toRecipients,ccRecipients,sentDateTime,receivedDateTime,internetMessageId";
  let url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const messages: GraphMessage[] = [];
  let nextCursor = connection.emailSyncCursor ?? "";

  // Delta can page; follow @odata.nextLink until we hit @odata.deltaLink (the new cursor).
  for (let i = 0; i < 20; i++) {
    const accessToken = await getValidAccessToken(connection);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Microsoft Graph delta query failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    messages.push(...(json.value ?? []));
    if (json["@odata.nextLink"]) {
      url = json["@odata.nextLink"];
      continue;
    }
    nextCursor = json["@odata.deltaLink"] ?? nextCursor;
    break;
  }

  return { messages, nextCursor };
}

export async function sendMail(connection: MailboxConnection, input: { to: string; subject: string; body: string; inReplyToInternetMessageId?: string }): Promise<string> {
  await graphFetch(connection, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: "Text", content: input.body },
        toRecipients: [{ emailAddress: { address: input.to } }],
      },
      saveToSentItems: true,
    }),
  });
  // Graph's sendMail doesn't return the created message; look it up in Sent Items to capture its internetMessageId for reply-threading.
  const sent = await graphFetch(
    connection,
    `/me/mailFolders/sentitems/messages?$top=1&$orderby=sentDateTime desc&$select=internetMessageId,subject`,
  );
  return sent?.value?.[0]?.internetMessageId ?? "";
}

/** Graph change-notification subscription (max 3 days for mail); renew well before expiry. Falls back to polling if this never succeeds. */
export async function createMailSubscription(connection: MailboxConnection, notificationUrl: string, clientState: string) {
  return graphFetch(connection, "/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      changeType: "created",
      notificationUrl,
      resource: "/me/mailFolders('inbox')/messages",
      expirationDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      clientState,
    }),
  });
}

export type GraphEvent = {
  id: string;
  iCalUId: string;
  subject: string | null;
  bodyPreview: string | null;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees?: { emailAddress?: { address?: string; name?: string } }[];
};

export async function listCalendarEventsDelta(connection: MailboxConnection): Promise<{ events: GraphEvent[]; nextCursor: string }> {
  const path =
    connection.calendarSyncCursor ??
    `/me/calendarView/delta?startDateTime=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}&endDateTime=${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`;
  let url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const events: GraphEvent[] = [];
  let nextCursor = connection.calendarSyncCursor ?? "";

  for (let i = 0; i < 20; i++) {
    const accessToken = await getValidAccessToken(connection);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'odata.maxpagesize="50"' } });
    if (!res.ok) throw new Error(`Microsoft Graph calendar delta failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    events.push(...(json.value ?? []));
    if (json["@odata.nextLink"]) {
      url = json["@odata.nextLink"];
      continue;
    }
    nextCursor = json["@odata.deltaLink"] ?? nextCursor;
    break;
  }

  return { events, nextCursor };
}
