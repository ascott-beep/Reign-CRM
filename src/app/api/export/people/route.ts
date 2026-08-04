import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canExport, type SessionUser } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!canExport(user.role)) return NextResponse.json({ error: "Read-only users cannot export data." }, { status: 403 });

  const filter = request.nextUrl.searchParams.get("filter");
  const where: Prisma.PersonWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (filter === "candidates") where.personTypes = { has: "CANDIDATE" };

  const people = await prisma.person.findMany({
    where,
    include: { relationshipOwner: true, candidateProfile: true },
    orderBy: { lastName: "asc" },
  });

  const rows = people.map((p) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    primaryEmail: p.primaryEmail ?? "",
    primaryPhone: p.primaryPhone ?? "",
    personTypes: p.personTypes.join("|"),
    relationshipStatus: p.relationshipStatus,
    candidateStatus: p.candidateProfile?.status ?? "",
    relationshipOwner: p.relationshipOwner ? `${p.relationshipOwner.firstName} ${p.relationshipOwner.lastName}` : "",
  }));

  const csv = toCsv(rows, ["firstName", "lastName", "primaryEmail", "primaryPhone", "personTypes", "relationshipStatus", "candidateStatus", "relationshipOwner"]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: "bulk-export",
    action: "EXPORT",
    changedFields: { rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="people.csv"' },
  });
}
