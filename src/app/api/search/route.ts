import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mandateVisibilityWhere, type SessionUser } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ groups: [] }, { status: 401 });
  const user = session.user as SessionUser;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const [organizations, people, opportunities, mandates, intelligence] = await Promise.all([
    prisma.organization.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { normalizedWebsiteDomain: { contains: q.toLowerCase(), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, type: true, status: true },
      take: 6,
    }),
    prisma.person.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { primaryEmail: { contains: q, mode: "insensitive" } },
          { headlineOverride: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, headlineOverride: true },
      take: 6,
    }),
    prisma.opportunity.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { potentialRoleTitle: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, stage: true },
      take: 6,
    }),
    prisma.mandate.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        AND: [mandateVisibilityWhere(user)],
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, reference: true, status: true },
      take: 6,
    }),
    prisma.intelligenceItem.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [{ title: { contains: q, mode: "insensitive" } }, { details: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, title: true, type: true },
      take: 6,
    }),
  ]);

  const groups = [
    {
      type: "organizations",
      label: "Organisations",
      items: organizations.map((o) => ({ id: o.id, title: o.name, subtitle: `${o.type} · ${o.status}`, href: `/organisations/${o.id}` })),
    },
    {
      type: "people",
      label: "People",
      items: people.map((p) => ({
        id: p.id,
        title: `${p.firstName} ${p.lastName}`,
        subtitle: p.headlineOverride ?? "",
        href: `/people/${p.id}`,
      })),
    },
    {
      type: "opportunities",
      label: "Opportunities",
      items: opportunities.map((o) => ({ id: o.id, title: o.name, subtitle: o.stage, href: `/opportunities/${o.id}` })),
    },
    {
      type: "mandates",
      label: "Mandates",
      items: mandates.map((m) => ({ id: m.id, title: `${m.reference} — ${m.title}`, subtitle: m.status, href: `/mandates/${m.id}` })),
    },
    {
      type: "intelligence",
      label: "Intelligence",
      items: intelligence.map((i) => ({ id: i.id, title: i.title, subtitle: i.type, href: `/intelligence/${i.id}` })),
    },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
