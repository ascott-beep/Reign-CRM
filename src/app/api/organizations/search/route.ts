import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { label } from "@/lib/labels";

/** Live organisation search for the Organisation combobox (Round 4 screens 26/27). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ results: [] }, { status: 401 });
  const user = session.user as SessionUser;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  const organizations = await prisma.organization.findMany({
    where: { workspaceId: user.workspaceId, archivedAt: null, name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  return NextResponse.json({
    results: organizations.map((o) => ({ id: o.id, name: o.name, typeLabel: label(o.type) })),
  });
}
