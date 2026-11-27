import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

/** Data for d01 "Create the mandate for this search", shown when an opportunity is moved to Won. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  const [opportunity, users] = await Promise.all([
    prisma.opportunity.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { hiringOrganization: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    opportunityName: opportunity.name,
    orgName: opportunity.hiringOrganization.name,
    role: opportunity.potentialRoleTitle ?? opportunity.name,
    ownerId: opportunity.ownerId,
    estimatedFeeAmount: opportunity.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: opportunity.estimatedFeeCurrency ?? "GBP",
    users: users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
  });
}
