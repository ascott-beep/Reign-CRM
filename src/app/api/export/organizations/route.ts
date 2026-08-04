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

  const typeParam = request.nextUrl.searchParams.get("type");
  const where: Prisma.OrganizationWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (typeParam === "PE_FUND") where.type = "PE_FUND";
  else if (typeParam === "PORTFOLIO_COMPANY") where.type = "PORTFOLIO_COMPANY";
  else if (typeParam === "OTHER") where.type = { notIn: ["PE_FUND", "PORTFOLIO_COMPANY"] };

  const organizations = await prisma.organization.findMany({
    where,
    include: { relationshipOwner: true },
    orderBy: { name: "asc" },
  });

  const rows = organizations.map((o) => ({
    name: o.name,
    type: o.type,
    status: o.status,
    website: o.website ?? "",
    hqCity: o.hqCity ?? "",
    hqCountryCode: o.hqCountryCode ?? "",
    accountPriority: o.accountPriority,
    relationshipOwner: o.relationshipOwner ? `${o.relationshipOwner.firstName} ${o.relationshipOwner.lastName}` : "",
  }));

  const csv = toCsv(rows, ["name", "type", "status", "website", "hqCity", "hqCountryCode", "accountPriority", "relationshipOwner"]);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: "bulk-export",
    action: "EXPORT",
    changedFields: { rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="organisations.csv"' },
  });
}
