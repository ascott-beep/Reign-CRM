import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { countryName } from "@/lib/iso";

async function loadOrg(id: string, workspaceId: string) {
  const org = await prisma.organization.findFirst({
    where: { id, workspaceId },
    include: { relationshipOwner: true },
  });
  if (!org) return null;
  return {
    id: org.id,
    name: org.name,
    website: org.website,
    hqCity: [org.hqCity, org.hqCountryCode ? countryName(org.hqCountryCode) : null].filter(Boolean).join(", ") || null,
    type: org.type,
    status: org.status,
    ownerId: org.relationshipOwnerId,
    ownerName: org.relationshipOwner ? `${org.relationshipOwner.firstName} ${org.relationshipOwner.lastName}` : "Unowned",
  };
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const survivorId = request.nextUrl.searchParams.get("survivorId");
  const duplicateId = request.nextUrl.searchParams.get("duplicateId");
  if (!survivorId || !duplicateId) return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  const [survivor, duplicate] = await Promise.all([loadOrg(survivorId, user.workspaceId), loadOrg(duplicateId, user.workspaceId)]);
  if (!survivor || !duplicate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ survivor, duplicate });
}
