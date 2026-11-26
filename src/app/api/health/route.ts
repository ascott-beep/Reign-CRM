import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Section 10.1 — admin-only health check for uptime monitoring. Accepts either
 * an admin session (checked from a browser) or the same CRON_SECRET bearer
 * token the cron routes use (checked by an external uptime monitor that can't
 * hold a login session).
 */
export async function GET(req: NextRequest) {
  const hasCronSecret = Boolean(process.env.CRON_SECRET) && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!hasCronSecret) {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "reachable", timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, database: "unreachable", error: error instanceof Error ? error.message : "Unknown error", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
