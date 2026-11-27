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
      include: {
        hiringOrganization: { select: { name: true } },
        stakeholders: { include: { person: { select: { firstName: true, lastName: true } } } },
        activities: { select: { activity: { select: { type: true } } } },
        documents: { select: { documentId: true } },
      },
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activityCount = opportunity.activities.filter((a) => a.activity.type !== "NOTE").length;
  const noteCount = opportunity.activities.filter((a) => a.activity.type === "NOTE").length;
  const documentCount = opportunity.documents.length;
  const firstStakeholder = opportunity.stakeholders[0];
  const clientContactName = opportunity.stakeholders.length === 1 && firstStakeholder ? `${firstStakeholder.person.firstName} ${firstStakeholder.person.lastName}` : null;
  const clientContactCount = opportunity.stakeholders.length;

  return NextResponse.json({
    opportunityName: opportunity.name,
    orgName: opportunity.hiringOrganization.name,
    role: opportunity.potentialRoleTitle ?? opportunity.name,
    ownerId: opportunity.ownerId,
    estimatedFeeAmount: opportunity.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: opportunity.estimatedFeeCurrency ?? "GBP",
    users: users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
    clientContactName,
    clientContactCount,
    activityCount,
    noteCount,
    documentCount,
  });
}
