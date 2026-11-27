import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMailboxConnection } from "@/lib/mailbox-sync";

/**
 * Round 2 section 7 "Use change notifications (Graph subscriptions, Gmail
 * push) with a 5-minute polling fallback." Graph's subscription-creation
 * handshake first sends `?validationToken=...` and expects it echoed back
 * as plain text; actual notifications arrive as a POST body afterwards.
 */
export async function POST(req: NextRequest) {
  const validationToken = req.nextUrl.searchParams.get("validationToken");
  if (validationToken) return new NextResponse(validationToken, { status: 200, headers: { "Content-Type": "text/plain" } });

  const body = await req.json().catch(() => null);
  const subscriptionIds = [...new Set((body?.value ?? []).map((n: { subscriptionId?: string }) => n.subscriptionId).filter(Boolean))] as string[];
  if (subscriptionIds.length === 0) return NextResponse.json({ ok: true });

  const connections = await prisma.mailboxConnection.findMany({ where: { graphSubscriptionId: { in: subscriptionIds } }, select: { id: true } });
  await Promise.allSettled(connections.map((c) => syncMailboxConnection(c.id)));
  return NextResponse.json({ ok: true });
}
