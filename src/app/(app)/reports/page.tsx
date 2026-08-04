import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { PipelineChart, PlacementFeesChart } from "./report-charts";

function groupCount<T, K extends string>(items: T[], key: (item: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export default async function ReportsPage() {
  const user = await requireUser();
  const wid = user.workspaceId;
  const mandateWhere = mandateVisibilityWhere(user);

  const [opportunities, mandates, processes, activities, placements, organizations, tasksMissing] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null },
      include: { owner: true },
    }),
    prisma.mandate.findMany({
      where: { workspaceId: wid, archivedAt: null, ...mandateWhere },
      include: { owner: true, hiringOrganization: true, practiceArea: true, statusHistory: true },
    }),
    prisma.candidateProcess.findMany({
      where: { workspaceId: wid, mandate: { ...mandateWhere } },
      include: { mandate: true },
    }),
    prisma.activity.findMany({ where: { workspaceId: wid }, include: { createdBy: true } }),
    prisma.placement.findMany({ where: { mandate: { workspaceId: wid } }, include: { candidateProcess: true } }),
    prisma.organization.findMany({
      where: { workspaceId: wid, archivedAt: null, type: "PORTFOLIO_COMPANY" },
      include: {
        personAssociations: true,
        opportunitiesAsHiringOrg: { where: { archivedAt: null } },
        mandatesAsHiringOrg: { where: { archivedAt: null } },
      },
    }),
    prisma.opportunity.count({ where: { workspaceId: wid, archivedAt: null, primaryNextTaskId: null, stage: { notIn: ["WON", "LOST"] } } }),
  ]);

  // 1. Opportunity pipeline by stage / owner / source
  const byStage = groupCount(opportunities, (o) => o.stage);
  const byOwner = groupCount(opportunities, (o) => `${o.owner.firstName} ${o.owner.lastName}`);
  const bySource = groupCount(opportunities, (o) => o.source);

  // 2. Mandates by status / owner / practice
  const mandatesByStatus = groupCount(mandates, (m) => m.status);
  const mandatesByOwner = groupCount(mandates, (m) => `${m.owner.firstName} ${m.owner.lastName}`);

  // 3 & 4. Candidate funnel + conversion
  const funnelStages = ["SOURCED", "LONGLISTED", "CONTACTED", "QUALIFIED", "SUBMITTED", "FIRST_INTERVIEW", "OFFER", "PLACED"];
  const stageEverReached = (stage: string) => {
    const idx = funnelStages.indexOf(stage);
    return processes.filter((p) => funnelStages.indexOf(p.stage) >= idx || p.stage === "PLACED").length;
  };
  const totalEntered = processes.length;

  // 6. Source-to-placement
  const placementsBySource = groupCount(placements, (p) => p.candidateProcess.source);
  const processesBySource = groupCount(processes, (p) => p.source);

  // 7. Placement fees by month (grouped by currency)
  const feesByMonthCurrency = new Map<string, number>();
  for (const p of placements) {
    if (!p.feeAmount) continue;
    const monthKey = `${p.placementDate.getFullYear()}-${String(p.placementDate.getMonth() + 1).padStart(2, "0")} (${p.feeCurrency ?? "GBP"})`;
    feesByMonthCurrency.set(monthKey, (feesByMonthCurrency.get(monthKey) ?? 0) + Number(p.feeAmount));
  }

  // 8. Activity volume by type / user
  const activityByType = groupCount(activities, (a) => a.type);
  const activityByUser = groupCount(activities, (a) => `${a.createdBy.firstName} ${a.createdBy.lastName}`);

  // 9. Portfolio coverage
  const coverage = organizations.map((o) => ({
    name: o.name,
    stakeholders: o.personAssociations.length,
    opportunities: o.opportunitiesAsHiringOrg.length,
    mandates: o.mandatesAsHiringOrg.length,
    lastVerified: o.lastVerifiedAt,
  }));

  // 10. Data quality
  const unverifiedOrgs = await prisma.organization.count({ where: { workspaceId: wid, archivedAt: null, lastVerifiedAt: null } });
  const candidatesWithoutEmployment = await prisma.person.count({
    where: { workspaceId: wid, archivedAt: null, personTypes: { has: "CANDIDATE" }, employmentHistories: { none: {} } },
  });
  const mandatesWithoutHiringManager = mandates.filter((m) => !m.hiringManagerPersonId).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Reports" description="Operational reporting across the desk. All figures reflect records you can access." />

      <Card>
        <CardHeader>
          <CardTitle>1. Opportunity pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineChart data={Object.entries(byStage).map(([stage, count]) => ({ stage: label(stage), count }))} />
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-ink-subtle)]">By owner</p>
              <ul className="text-sm">
                {Object.entries(byOwner).map(([owner, count]) => (
                  <li key={owner} className="flex justify-between border-b border-[var(--color-border)] py-1">
                    <span>{owner}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-ink-subtle)]">By source</p>
              <ul className="text-sm">
                {Object.entries(bySource).map(([source, count]) => (
                  <li key={source} className="flex justify-between border-b border-[var(--color-border)] py-1">
                    <span>{label(source)}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Mandates by status &amp; owner</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <ul className="text-sm">
            {Object.entries(mandatesByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between border-b border-[var(--color-border)] py-1">
                <span>{label(status)}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
          <ul className="text-sm">
            {Object.entries(mandatesByOwner).map(([owner, count]) => (
              <li key={owner} className="flex justify-between border-b border-[var(--color-border)] py-1">
                <span>{owner}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 &amp; 4. Candidate funnel &amp; conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm">
            {funnelStages.map((stage) => {
              const reached = stageEverReached(stage);
              const pct = totalEntered > 0 ? Math.round((reached / totalEntered) * 100) : 0;
              return (
                <li key={stage} className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                  <span>{label(stage)}</span>
                  <span className="text-[var(--color-ink-subtle)]">
                    {reached} / {totalEntered} ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Source-to-placement performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Candidates sourced</TableHead>
                <TableHead>Placements</TableHead>
                <TableHead>Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(processesBySource).map(([source, sourced]) => {
                const placed = placementsBySource[source as keyof typeof placementsBySource] ?? 0;
                return (
                  <TableRow key={source}>
                    <TableCell>{label(source)}</TableCell>
                    <TableCell>{sourced}</TableCell>
                    <TableCell>{placed}</TableCell>
                    <TableCell>{sourced > 0 ? `${Math.round((placed / sourced) * 100)}%` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Placement fees by month</CardTitle>
        </CardHeader>
        <CardContent>
          <PlacementFeesChart data={Array.from(feesByMonthCurrency.entries()).map(([month, amount]) => ({ month, amount }))} />
          <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">Grouped by currency — totals are not converted between currencies.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Activity volume</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <ul className="text-sm">
            {Object.entries(activityByType).map(([type, count]) => (
              <li key={type} className="flex justify-between border-b border-[var(--color-border)] py-1">
                <span>{label(type)}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
          <ul className="text-sm">
            {Object.entries(activityByUser).map(([userName, count]) => (
              <li key={userName} className="flex justify-between border-b border-[var(--color-border)] py-1">
                <span>{userName}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Portfolio-company coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Stakeholders</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Mandates</TableHead>
                <TableHead>Last verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coverage.map((c) => (
                <TableRow key={c.name}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.stakeholders}</TableCell>
                  <TableCell>{c.opportunities}</TableCell>
                  <TableCell>{c.mandates}</TableCell>
                  <TableCell>{c.lastVerified ? c.lastVerified.toLocaleDateString() : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10. Data quality</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <li className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-2xl font-semibold">{unverifiedOrgs}</p>
              <p className="text-[var(--color-ink-subtle)]">Organisations never verified</p>
            </li>
            <li className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-2xl font-semibold">{candidatesWithoutEmployment}</p>
              <p className="text-[var(--color-ink-subtle)]">Candidates without employment history</p>
            </li>
            <li className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-2xl font-semibold">{mandatesWithoutHiringManager}</p>
              <p className="text-[var(--color-ink-subtle)]">Mandates without a hiring manager</p>
            </li>
            <li className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-2xl font-semibold">{tasksMissing}</p>
              <p className="text-[var(--color-ink-subtle)]">Opportunities with no next action</p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--color-ink-subtle)]">
        Placement fees shown are exact figures; totals are grouped by currency rather than converted, since no exchange-rate
        table has been configured (5. Time-in-stage / time-to-fill is available via stage/status history on individual
        opportunity, mandate and candidate-process records).
      </p>
    </div>
  );
}
