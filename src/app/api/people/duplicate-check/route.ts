import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { findPersonDuplicates } from "@/lib/duplicates";

/** Live duplicate check for the New person form (Round 4 screen 26) -- runs on name and email as you type. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ match: null }, { status: 401 });
  const user = session.user as SessionUser;

  const firstName = request.nextUrl.searchParams.get("firstName")?.trim() ?? "";
  const lastName = request.nextUrl.searchParams.get("lastName")?.trim() ?? "";
  const email = request.nextUrl.searchParams.get("email")?.trim() || null;
  const excludeId = request.nextUrl.searchParams.get("excludeId") ?? undefined;
  if (!firstName && !lastName && !email) return NextResponse.json({ match: null });

  const matches = await findPersonDuplicates(user.workspaceId, { firstName, lastName, primaryEmail: email }, excludeId);
  const top = matches[0];
  if (!top) return NextResponse.json({ match: null });

  const org = await prisma.person.findUnique({
    where: { id: top.id },
    select: {
      employmentHistories: { where: { isCurrent: true }, select: { organization: { select: { name: true } } }, take: 1 },
      organizationAssociations: { where: { isCurrent: true }, select: { organization: { select: { name: true } } }, take: 1 },
    },
  });
  const orgName = org?.organizationAssociations[0]?.organization.name ?? org?.employmentHistories[0]?.organization?.name ?? null;

  return NextResponse.json({
    match: { id: top.id, name: `${top.firstName} ${top.lastName}`, orgName, reason: top.reason },
  });
}
