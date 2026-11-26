import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

async function loadPerson(id: string, workspaceId: string) {
  const person = await prisma.person.findFirst({
    where: { id, workspaceId },
    include: {
      relationshipOwner: true,
      candidateProfile: true,
      practiceAreas: { include: { practiceArea: true } },
      employmentHistories: { where: { isCurrent: true }, take: 1 },
    },
  });
  if (!person) return null;
  return {
    id: person.id,
    name: `${person.firstName} ${person.lastName}`,
    firstName: person.firstName,
    lastName: person.lastName,
    title: person.headlineOverride || person.employmentHistories[0]?.jobTitle || null,
    status: person.relationshipStatus,
    ownerId: person.relationshipOwnerId,
    ownerName: person.relationshipOwner ? `${person.relationshipOwner.firstName} ${person.relationshipOwner.lastName}` : "Unowned",
    rating: person.candidateProfile?.rating ?? null,
    practiceAreaNames: person.practiceAreas.map((pa) => pa.practiceArea.name),
  };
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const survivorId = request.nextUrl.searchParams.get("survivorId");
  const duplicateId = request.nextUrl.searchParams.get("duplicateId");
  if (!survivorId || !duplicateId) return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  const [survivor, duplicate] = await Promise.all([loadPerson(survivorId, user.workspaceId), loadPerson(duplicateId, user.workspaceId)]);
  if (!survivor || !duplicate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ survivor, duplicate });
}
