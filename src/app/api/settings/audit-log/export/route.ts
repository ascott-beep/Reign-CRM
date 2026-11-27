import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/permissions";
import { describeAuditLog } from "@/lib/audit";
import { formatDateTime, startOfTodayInLondon } from "@/lib/datetime";
import { toCsv } from "@/lib/csv";
import type { SessionUser } from "@/lib/permissions";

/** Settings > Audit log (screen 42) "Download" button -- same filters as the page itself. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!canViewAuditLog(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const actorId = sp.get("who") ?? undefined;
  const entityType = sp.get("what") ?? undefined;
  const when = sp.get("when") ?? "30";
  const since = when === "all" ? undefined : new Date(startOfTodayInLondon().getTime() - Number(when) * 24 * 60 * 60 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: {
      workspaceId: user.workspaceId,
      ...(actorId ? { actorId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(since ? { timestamp: { gte: since } } : {}),
    },
    include: { actor: true },
    orderBy: { timestamp: "desc" },
    take: 5000,
  });

  const rows = logs.map((log) => ({
    when: formatDateTime(log.timestamp),
    who: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System",
    record_type: log.entityType,
    record_id: log.entityId,
    what: describeAuditLog(log),
  }));

  const csv = toCsv(rows, ["when", "who", "record_type", "record_id", "what"]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-log.csv"`,
    },
  });
}
