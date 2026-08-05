import Link from "next/link";
import { TrendingUp, Target, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/utils";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  const wid = user.workspaceId;
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const mandateWhere = mandateVisibilityWhere(user);

  const [
    myTasksToday,
    myTasksOverdue,
    activeOpportunities,
    openOpportunitiesForForecast,
    activeMandates,
    processesAwaitingAction,
    upcomingInterviews,
    outstandingOffers,
    placementsThisMonth,
    orgsWithoutNextTask,
    stalePriorityOrgs,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        workspaceId: wid,
        assignedUserId: user.id,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.task.count({
      where: {
        workspaceId: wid,
        assignedUserId: user.id,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { lt: startOfToday },
      },
    }),
    prisma.opportunity.count({
      where: { workspaceId: wid, archivedAt: null, stage: { notIn: ["WON", "LOST"] } },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null, stage: { notIn: ["WON", "LOST", "ON_HOLD"] } },
      select: { stage: true, estimatedFeeAmount: true, probabilityOverride: true, isProbabilityOverridden: true, estimatedFeeCurrency: true },
    }),
    prisma.mandate.count({
      where: { workspaceId: wid, archivedAt: null, status: { notIn: ["FILLED", "CANCELLED"] }, ...mandateWhere },
    }),
    prisma.candidateProcess.count({
      where: {
        workspaceId: wid,
        stage: { notIn: ["PLACED", "REJECTED", "WITHDRAWN"] },
        mandate: { archivedAt: null, ...mandateWhere },
      },
    }),
    prisma.interview.count({
      where: {
        scheduledStart: { gte: now, lte: in7Days },
        candidateProcess: { mandate: { workspaceId: wid, ...mandateWhere } },
      },
    }),
    prisma.offer.count({
      where: {
        status: { in: ["PLANNED", "MADE", "NEGOTIATING"] },
        candidateProcess: { mandate: { workspaceId: wid, ...mandateWhere } },
      },
    }),
    prisma.placement.findMany({
      where: {
        mandate: { workspaceId: wid },
        placementDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      select: { feeAmount: true, feeCurrency: true },
    }),
    prisma.organization.count({
      where: { workspaceId: wid, archivedAt: null, type: { in: ["PORTFOLIO_COMPANY", "PE_FUND"] }, accountPriority: "PRIORITY" },
    }),
    prisma.organization.count({
      where: {
        workspaceId: wid,
        archivedAt: null,
        accountPriority: "PRIORITY",
        OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) } }],
      },
    }),
  ]);

  const weightedValue = openOpportunitiesForForecast.reduce((sum, o) => {
    const prob = o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : OPPORTUNITY_STAGE_PROBABILITY[o.stage] ?? 0;
    const amount = o.estimatedFeeAmount ? Number(o.estimatedFeeAmount) : 0;
    return sum + (amount * prob) / 100;
  }, 0);

  const placementFeesThisMonth = placementsThisMonth.reduce((sum, p) => sum + (p.feeAmount ? Number(p.feeAmount) : 0), 0);

  const cards: { title: string; value: string; href: string; description?: string }[] = [
    { title: "My tasks due today", value: String(myTasksToday), href: "/tasks?filter=today" },
    { title: "My overdue tasks", value: String(myTasksOverdue), href: "/tasks?filter=overdue" },
    { title: "Active opportunities", value: String(activeOpportunities), href: "/opportunities" },
    { title: "Weighted opportunity value", value: formatMoney(weightedValue, "GBP"), href: "/opportunities", description: "Probability-weighted, open stages only" },
    { title: "Active mandates", value: String(activeMandates), href: "/mandates" },
    { title: "Candidate processes awaiting action", value: String(processesAwaitingAction), href: "/mandates" },
    { title: "Interviews in next 7 days", value: String(upcomingInterviews), href: "/mandates" },
    { title: "Offers outstanding", value: String(outstandingOffers), href: "/mandates" },
    { title: "Placements this month", value: formatMoney(placementFeesThisMonth, "GBP"), href: "/reports", description: "Fee value, this calendar month" },
    { title: "Priority organisations", value: String(orgsWithoutNextTask), href: "/organisations" },
    { title: "Stale priority organisations", value: String(stalePriorityOrgs), href: "/organisations", description: "No verification in 60+ days" },
  ];

  const [recentOpportunities, recentMandates] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { hiringOrganization: { select: { name: true } } },
    }),
    prisma.mandate.findMany({
      where: { workspaceId: wid, archivedAt: null, ...mandateWhere },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { hiringOrganization: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title={`Welcome back, ${user.firstName}`} description="Here's what's moving across the desk." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-[var(--color-ink-subtle)]">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[var(--color-ink)]">{card.value}</p>
                {card.description ? <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{card.description}</p> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recently updated opportunities</CardTitle>
            <Link href="/opportunities" className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--color-border)] p-0">
            {recentOpportunities.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--color-ink-subtle)]">No opportunities yet.</p>
            ) : (
              recentOpportunities.map((o) => (
                <Link
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{o.name}</span>
                    <span className="block truncate text-xs text-[var(--color-ink-subtle)]">
                      {o.hiringOrganization.name} · updated {formatDistanceToNow(o.updatedAt, { addSuffix: true })}
                    </span>
                  </span>
                  <StatusBadge value={o.stage} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recently updated mandates</CardTitle>
            <Link href="/mandates" className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--color-border)] p-0">
            {recentMandates.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--color-ink-subtle)]">No mandates yet.</p>
            ) : (
              recentMandates.map((m) => (
                <Link
                  key={m.id}
                  href={`/mandates/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                    <Target className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--color-ink)]">
                      {m.reference} — {m.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-ink-subtle)]">
                      {m.hiringOrganization.name} · updated {formatDistanceToNow(m.updatedAt, { addSuffix: true })}
                    </span>
                  </span>
                  <StatusBadge value={m.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
