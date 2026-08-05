import { TrendingUp, Briefcase, Users2, Banknote, Target, Activity as ActivityIcon, Building2, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { normalizeExchangeRates, convertAmount } from "@/lib/currency";
import { ReportFilters } from "./report-filters";
import { PipelineChart, PlacementFeesChart } from "./report-charts";

function groupCount<T, K extends string>(items: T[], key: (item: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function StatTile({ icon: Icon, label: statLabel, value, description }: { icon: React.ElementType; label: string; value: string; description?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-ink-subtle)]">{statLabel}</p>
          <p className="mt-0.5 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
          {description ? <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{description}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{description}</p> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatList({ entries }: { entries: [string, number][] }) {
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {entries.map(([key, count]) => (
        <li key={key}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[var(--color-ink)]">{key}</span>
            <span className="font-medium text-[var(--color-ink-subtle)]">{count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas)]">
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const wid = user.workspaceId;
  const mandateWhere = mandateVisibilityWhere(user);
  const sp = await searchParams;
  const filterUserId = typeof sp.user === "string" ? sp.user : "all";

  const [workspace, teamUsers] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: wid } }),
    prisma.user.findMany({ where: { workspaceId: wid }, orderBy: { firstName: "asc" } }),
  ]);
  const rates = normalizeExchangeRates(workspace.exchangeRatesToGbp);
  const currency = typeof sp.currency === "string" ? sp.currency : workspace.defaultCurrency;
  const convert = (amount: number, from: string | null | undefined) => convertAmount(amount, from ?? currency, currency, rates);

  const ownerFilter = filterUserId !== "all" ? { ownerId: filterUserId } : {};
  const userScoped = filterUserId !== "all";

  const [opportunities, mandates, processes, activities, placements, organizations, tasksMissing] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null, ...ownerFilter },
      include: { owner: true },
    }),
    prisma.mandate.findMany({
      where: { workspaceId: wid, archivedAt: null, ...mandateWhere, ...ownerFilter },
      include: { owner: true, hiringOrganization: true, practiceArea: true, statusHistory: true },
    }),
    prisma.candidateProcess.findMany({
      where: { workspaceId: wid, mandate: { ...mandateWhere }, ...(userScoped ? { ownerId: filterUserId } : {}) },
      include: { mandate: true },
    }),
    prisma.activity.findMany({ where: { workspaceId: wid, ...(userScoped ? { createdById: filterUserId } : {}) }, include: { createdBy: true } }),
    prisma.placement.findMany({
      where: { mandate: { workspaceId: wid }, ...(userScoped ? { candidateProcess: { ownerId: filterUserId } } : {}) },
      include: { candidateProcess: true },
    }),
    prisma.organization.findMany({
      where: { workspaceId: wid, archivedAt: null, type: "PORTFOLIO_COMPANY", ...(userScoped ? { relationshipOwnerId: filterUserId } : {}) },
      include: {
        personAssociations: true,
        opportunitiesAsHiringOrg: { where: { archivedAt: null } },
        mandatesAsHiringOrg: { where: { archivedAt: null } },
      },
    }),
    prisma.opportunity.count({ where: { workspaceId: wid, archivedAt: null, primaryNextTaskId: null, stage: { notIn: ["WON", "LOST"] }, ...ownerFilter } }),
  ]);

  // Opportunity pipeline by stage / owner / source
  const byStage = groupCount(opportunities, (o) => o.stage);
  const byOwner = groupCount(opportunities, (o) => `${o.owner.firstName} ${o.owner.lastName}`);
  const bySource = groupCount(opportunities, (o) => o.source);

  const openOpportunities = opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST");
  const weightedPipelineValue = openOpportunities.reduce((sum, o) => {
    if (!o.estimatedFeeAmount) return sum;
    const prob = o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : (OPPORTUNITY_STAGE_PROBABILITY[o.stage] ?? 0);
    return sum + (convert(Number(o.estimatedFeeAmount), o.estimatedFeeCurrency) * prob) / 100;
  }, 0);

  // Mandates by status / owner / practice
  const mandatesByStatus = groupCount(mandates, (m) => m.status);
  const mandatesByOwner = groupCount(mandates, (m) => `${m.owner.firstName} ${m.owner.lastName}`);
  const activeMandates = mandates.filter((m) => m.status !== "FILLED" && m.status !== "CANCELLED").length;

  // Candidate funnel + conversion
  const funnelStages = ["SOURCED", "LONGLISTED", "CONTACTED", "QUALIFIED", "SUBMITTED", "FIRST_INTERVIEW", "OFFER", "PLACED"];
  const stageEverReached = (stage: string) => {
    const idx = funnelStages.indexOf(stage);
    return processes.filter((p) => funnelStages.indexOf(p.stage) >= idx || p.stage === "PLACED").length;
  };
  const totalEntered = processes.length;
  const totalPlaced = processes.filter((p) => p.stage === "PLACED").length;
  const overallConversion = totalEntered > 0 ? Math.round((totalPlaced / totalEntered) * 100) : 0;

  // Source-to-placement
  const placementsBySource = groupCount(placements, (p) => p.candidateProcess.source);
  const processesBySource = groupCount(processes, (p) => p.source);

  // Placement fees by month — converted into the selected display currency
  const feesByMonth = new Map<string, number>();
  let totalPlacementFees = 0;
  for (const p of placements) {
    if (!p.feeAmount) continue;
    const converted = convert(Number(p.feeAmount), p.feeCurrency);
    totalPlacementFees += converted;
    const monthKey = `${p.placementDate.getFullYear()}-${String(p.placementDate.getMonth() + 1).padStart(2, "0")}`;
    feesByMonth.set(monthKey, (feesByMonth.get(monthKey) ?? 0) + converted);
  }

  // Activity volume by type / user
  const activityByType = groupCount(activities, (a) => a.type);
  const activityByUser = groupCount(activities, (a) => `${a.createdBy.firstName} ${a.createdBy.lastName}`);

  // Portfolio coverage
  const coverage = organizations.map((o) => ({
    name: o.name,
    stakeholders: o.personAssociations.length,
    opportunities: o.opportunitiesAsHiringOrg.length,
    mandates: o.mandatesAsHiringOrg.length,
    lastVerified: o.lastVerifiedAt,
  }));

  // Data quality (workspace-wide — not meaningfully scoped to a single user)
  const unverifiedOrgs = await prisma.organization.count({ where: { workspaceId: wid, archivedAt: null, lastVerifiedAt: null } });
  const candidatesWithoutEmployment = await prisma.person.count({
    where: { workspaceId: wid, archivedAt: null, personTypes: { has: "CANDIDATE" }, employmentHistories: { none: {} } },
  });
  const mandatesWithoutHiringManager = mandates.filter((m) => !m.hiringManagerPersonId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Operational reporting across the desk. All figures reflect records you can access."
        actions={<ReportFilters users={teamUsers} currentUserId={filterUserId} currentCurrency={currency} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Briefcase} label="Open opportunities" value={String(openOpportunities.length)} />
        <StatTile icon={TrendingUp} label="Weighted pipeline" value={formatMoney(weightedPipelineValue, currency)} description="Probability-weighted" />
        <StatTile icon={Target} label="Active mandates" value={String(activeMandates)} />
        <StatTile icon={Banknote} label="Placement fees" value={formatMoney(totalPlacementFees, currency)} description={`${placements.length} placement${placements.length === 1 ? "" : "s"}`} />
        <StatTile icon={Users2} label="Overall conversion" value={`${overallConversion}%`} description={`${totalPlaced} / ${totalEntered} candidates`} />
      </div>

      <SectionCard icon={TrendingUp} title="Opportunity pipeline" description="Open opportunities by stage, owner, and source">
        <PipelineChart data={Object.entries(byStage).map(([stage, count]) => ({ stage: label(stage), count }))} />
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By owner</p>
            <StatList entries={Object.entries(byOwner)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By source</p>
            <StatList entries={Object.entries(bySource).map(([k, v]) => [label(k), v])} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Target} title="Mandates by status & owner">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By status</p>
            <StatList entries={Object.entries(mandatesByStatus).map(([k, v]) => [label(k), v])} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By owner</p>
            <StatList entries={Object.entries(mandatesByOwner)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Users2} title="Candidate funnel & conversion" description="Candidates who ever reached each stage, out of everyone entered">
        <ul className="flex flex-col gap-2.5 text-sm">
          {funnelStages.map((stage) => {
            const reached = stageEverReached(stage);
            const pct = totalEntered > 0 ? Math.round((reached / totalEntered) * 100) : 0;
            return (
              <li key={stage}>
                <div className="mb-1 flex items-center justify-between">
                  <span>{label(stage)}</span>
                  <span className="text-[var(--color-ink-subtle)]">
                    {reached} / {totalEntered} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas)]">
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard icon={ActivityIcon} title="Source-to-placement performance">
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
      </SectionCard>

      <SectionCard icon={Banknote} title="Placement fees by month" description={`Converted to ${currency} using Settings > Workspace exchange rates`}>
        <PlacementFeesChart data={Array.from(feesByMonth.entries()).map(([month, amount]) => ({ month, amount }))} />
      </SectionCard>

      <SectionCard icon={ActivityIcon} title="Activity volume">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By type</p>
            <StatList entries={Object.entries(activityByType).map(([k, v]) => [label(k), v])} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">By user</p>
            <StatList entries={Object.entries(activityByUser)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Building2} title="Portfolio-company coverage">
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
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.stakeholders}</TableCell>
                <TableCell>{c.opportunities}</TableCell>
                <TableCell>{c.mandates}</TableCell>
                <TableCell className="text-[var(--color-ink-subtle)]">{c.lastVerified ? c.lastVerified.toLocaleDateString() : "Never"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard icon={ShieldAlert} title="Data quality" description="Workspace-wide — not scoped to the user filter above">
        <ul className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <li className="rounded-md border border-[var(--color-border)] p-3">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">{unverifiedOrgs}</p>
            <p className="text-[var(--color-ink-subtle)]">Organisations never verified</p>
          </li>
          <li className="rounded-md border border-[var(--color-border)] p-3">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">{candidatesWithoutEmployment}</p>
            <p className="text-[var(--color-ink-subtle)]">Candidates without employment history</p>
          </li>
          <li className="rounded-md border border-[var(--color-border)] p-3">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">{mandatesWithoutHiringManager}</p>
            <p className="text-[var(--color-ink-subtle)]">Mandates without a hiring manager</p>
          </li>
          <li className="rounded-md border border-[var(--color-border)] p-3">
            <p className="text-2xl font-semibold text-[var(--color-ink)]">{tasksMissing}</p>
            <p className="text-[var(--color-ink-subtle)]">Opportunities with no next action</p>
          </li>
        </ul>
      </SectionCard>

      <p className="text-xs text-[var(--color-ink-subtle)]">
        Monetary totals are converted using manually maintained exchange rates (Settings &gt; Workspace) — there is no live FX
        feed. Time-in-stage / time-to-fill is available via stage/status history on individual opportunity, mandate and
        candidate-process records.
      </p>
    </div>
  );
}
