import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mandateVisibilityWhere, type SessionUser } from "@/lib/permissions";
import { findAllOrganizationDuplicatePairs, findAllPersonDuplicatePairs } from "@/lib/duplicates";
import { label } from "@/lib/labels";
import { LIVE_MANDATE_STATUSES, OPEN_OPPORTUNITY_STAGES } from "@/lib/rules";
import { formatMoney } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ groups: [] }, { status: 401 });
  const user = session.user as SessionUser;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const [organizations, people, opportunities, mandates, intelligence, orgDuplicates, personDuplicates] = await Promise.all([
    prisma.organization.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { normalizedWebsiteDomain: { contains: q.toLowerCase(), mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        relationshipsAsTarget: { where: { investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } }, select: { sourceOrganization: { select: { name: true } } }, take: 1 },
      },
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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        headlineOverride: true,
        personTypes: true,
        employmentHistories: { where: { isCurrent: true }, select: { jobTitle: true, organization: { select: { name: true } } }, take: 1 },
        organizationAssociations: { where: { isCurrent: true }, select: { organization: { select: { name: true } } }, take: 1 },
      },
      take: 6,
    }),
    prisma.opportunity.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { potentialRoleTitle: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, name: true, stage: true, estimatedFeeAmount: true, estimatedFeeCurrency: true, hiringOrganization: { select: { name: true } } },
      take: 6,
    }),
    prisma.mandate.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        AND: [mandateVisibilityWhere(user)],
        OR: [{ title: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, title: true, reference: true, status: true, hiringOrganization: { select: { name: true } } },
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
    findAllOrganizationDuplicatePairs(user.workspaceId),
    findAllPersonDuplicatePairs(user.workspaceId),
  ]);

  const groups = [
    {
      type: "organizations",
      label: "Organisations",
      items: organizations.map((o) => ({
        id: o.id,
        title: o.name,
        subtitle: orgDuplicates.has(o.id) ? "Possible duplicate" : `${label(o.type)}${o.relationshipsAsTarget[0] ? ` · ${o.relationshipsAsTarget[0].sourceOrganization.name}` : ""}`,
        tag: orgDuplicates.has(o.id) ? null : label(o.status),
        href: `/organisations/${o.id}`,
      })),
    },
    {
      type: "mandates",
      label: "Mandates",
      items: mandates.map((m) => ({
        id: m.id,
        title: m.title,
        subtitle: `${m.hiringOrganization.name} · ${label(m.status)}`,
        tag: (LIVE_MANDATE_STATUSES as readonly string[]).includes(m.status) ? "Live" : "Closed",
        href: `/mandates/${m.id}`,
      })),
    },
    {
      type: "opportunities",
      label: "Opportunities",
      items: opportunities.map((o) => ({
        id: o.id,
        title: o.name,
        subtitle: `${o.hiringOrganization.name} · ${label(o.stage)}${o.estimatedFeeAmount ? ` · ${formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)}` : ""}`,
        tag: (OPEN_OPPORTUNITY_STAGES as readonly string[]).includes(o.stage) ? "Open" : label(o.stage),
        href: `/opportunities/${o.id}`,
      })),
    },
    {
      type: "people",
      label: "People",
      items: people.map((p) => {
        const org = p.organizationAssociations[0]?.organization.name ?? p.employmentHistories[0]?.organization?.name ?? null;
        const title = p.headlineOverride?.split(",")[0] ?? p.employmentHistories[0]?.jobTitle ?? null;
        return {
          id: p.id,
          title: `${p.firstName} ${p.lastName}`,
          subtitle: personDuplicates.has(p.id) ? "Possible duplicate" : [title, org].filter(Boolean).join(" · "),
          tag: personDuplicates.has(p.id) ? null : p.personTypes.includes("CANDIDATE") ? "Candidate" : "Contact",
          href: `/people/${p.id}`,
        };
      }),
    },
    {
      type: "intelligence",
      label: "Intelligence",
      items: intelligence.map((i) => ({ id: i.id, title: i.title, subtitle: label(i.type), tag: null, href: `/intelligence/${i.id}` })),
    },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
