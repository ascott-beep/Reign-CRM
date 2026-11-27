import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMailboxConnection } from "@/lib/mailbox-sync";

/** Round 2 section 7 Gmail push, delivered via a Google Cloud Pub/Sub push subscription — see the wrap-up notes for the topic/subscription setup this needs. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const dataB64 = body?.message?.data;
  if (!dataB64) return NextResponse.json({ ok: true });

  const decoded = JSON.parse(Buffer.from(dataB64, "base64").toString("utf8")) as { emailAddress?: string };
  if (!decoded.emailAddress) return NextResponse.json({ ok: true });

  const connection = await prisma.mailboxConnection.findFirst({ where: { provider: "GOOGLE", emailAddress: decoded.emailAddress }, select: { id: true } });
  if (connection) await syncMailboxConnection(connection.id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
