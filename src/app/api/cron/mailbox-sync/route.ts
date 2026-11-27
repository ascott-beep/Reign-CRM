import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMailboxConnection, ensureChangeNotifications } from "@/lib/mailbox-sync";

/**
 * Round 2 section 7 "5-minute polling fallback" — catches anything a Graph
 * subscription or Gmail push notification missed (expired subscription,
 * dropped push, or a connection where registering one never succeeded).
 * Vercel's free plan only guarantees once-daily cron, so a 5-minute
 * schedule needs at least the Pro plan — see the wrap-up notes.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.mailboxConnection.findMany({ where: { status: { not: "DISCONNECTED" } } });
  await Promise.allSettled(connections.map((c) => ensureChangeNotifications(c)));
  const results = await Promise.allSettled(connections.map((c) => syncMailboxConnection(c.id)));
  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ checked: connections.length, failed });
}
