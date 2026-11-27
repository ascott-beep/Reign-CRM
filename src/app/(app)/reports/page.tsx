import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { DeskPicker } from "@/components/shell/desk-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { normalizeExchangeRates, convertAmount } from "@/lib/currency";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { orgShortName, OPEN_OPPORTUNITY_STAGES } from "@/lib/rules";
import { Download } from "lucide-react";
import { PeriodPicker } from "./period-picker";

const CANDIDATE_FUNNEL_STAGES = ["SOURCED", "LONGLISTED", "CONTACTED", "QUALIFIED", "SUBMITTED", "FIRST_INTERVIEW", "OFFER", "PLACED"] as const;

function periodStart(period: string): Date | undefined {
  const now = new Date();
  if (period === "this-year") return new Date(now.getFullYear(), 0, 1);
  if (period === "last-12-months") return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return undefined; // "all-time"
}

function ShareBar({ label: rowLabel, count, total, highlight }: { label: string; count: number; total: number; highlight?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="grid grid-cols-[120px_1fr_90px] items-center gap-3 py-1.5 text-[13px]">
      <span className="truncate text-[var(--color-ink2)]">{rowLabel}</span>
      <span className="relative h-2 overflow-hidden rounded-full bg-[var(--color-track)]">
        <span className={`absolute inset-y-0 left-0 rounded-full ${highlight ? "bg-[var(--color-dot)]" : "bg-[var(--color-bar)]"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[var(--color-muted)]">
        {pct}% · {count} of {total}
      </span>
    </div>
  );
}

function CountBar({ rowLabel, count, max }: { rowLabel: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between text-[13.5px]">
        <span>{rowLabel}</span>
        <span className="text-[var(--color-muted)]">{count}</span>
      </div>
      <span className="relative block h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-bar)]" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function KpiCard({ label: kpiLabel, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[18px] py-3.5">
      <div className="text-[12.5px] text-[var(--color-muted)]">{kpiLabel}</div>
      <div className="mt-1.5 text-[22px] font-light tracking-[-0.02em]">{value}</div>
      {description ? <div className="mt-1 text-xs text-[var(--color-muted)]">{description}</div> : null}
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 flex-1 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
      <h2 className="m-0 text-base font-medium">{title}</h2>
      {description ? <p className="mt-1 text-[13px] text-[var(--color-muted)]">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const wid = user.workspaceId;
  const mandateWhere = mandateVisibilityWhere(user);
  const sp = await searchParams;
  const period = typeof sp.period === "string" && ["this-year", "last-12-months", "all-time"].includes(sp.period) ? sp.period : "this-year";
  const since = periodStart(period);

  const [cookieStore, workspace, consultants] = await Promise.all([
    cookies(),
    prisma.workspace.findUniqueOrThrow({ where: { id: wid } }),
    prisma.user.findMany({ where: { workspaceId: wid, active: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);
  const desk = cookieStore.get(DESK_COOKIE)?.value ?? "";
  const deskUserId = desk === "" ? undefined : desk === "me" ? user.id : desk;
  const deskLabel = desk === "" ? "all desks" : desk === "me" ? "your desk" : (consultants.find((c) => c.id === desk)?.firstName ?? "this desk");

  const rates = normalizeExchangeRates(workspace.exchangeRatesToGbp);
  const currency = workspace.defaultCurrency;
  const convert = (amount: number, from: string | null | undefined) => convertAmount(amount, from ?? currency, currency, rates);

  const ownerFilter = deskUserId ? { ownerId: deskUserId } : {};
  const periodFilter = since ? { gte: since } : undefined;

  const [opportunities, mandates, processes, activities, placements, tasksMissing] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null, ...ownerFilter, ...(periodFilter ? { createdAt: periodFilter } : {}) },
      include: { owner: true },
    }),
    prisma.mandate.findMany({
      where: { workspaceId: wid, archivedAt: null, ...mandateWhere, ...ownerFilter, ...(periodFilter ? { createdAt: periodFilter } : {}) },
      include: { owner: true, hiringOrganization: true },
    }),
    prisma.candidateProcess.findMany({
      where: { workspaceId: wid, mandate: { ...mandateWhere }, ...(deskUserId ? { ownerId: deskUserId } : {}), ...(periodFilter ? { createdAt: periodFilter } : {}) },
      include: { mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } },
    }),
    prisma.activity.findMany({ where: { workspaceId: wid, ...(deskUserId ? { createdById: deskUserId } : {}), ...(periodFilter ? { occurredAt: periodFilter } : {}) }, include: { createdBy: true } }),
    prisma.placement.findMany({
      where: { mandate: { workspaceId: wid }, ...(deskUserId ? { candidateProcess: { ownerId: deskUserId } } : {}), ...(periodFilter ? { placementDate: periodFilter } : {}) },
      include: { candidateProcess: true },
    }),
    // Same definition of "open" as the Opportunities board/Fix link (OPEN_OPPORTUNITY_STAGES) —
    // excluding ON_HOLD too, so this count and the filtered list it links to always agree.
    prisma.opportunity.count({ where: { workspaceId: wid, archivedAt: null, primaryNextTaskId: null, stage: { in: OPEN_OPPORTUNITY_STAGES }, ...ownerFilter } }),
  ]);

  const openOpportunities = opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST");
  const weightedPipelineValue = openOpportunities.reduce((sum, o) => {
    if (!o.estimatedFeeAmount) return sum;
    const prob = o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : (OPPORTUNITY_STAGE_PROBABILITY[o.stage] ?? 0);
    return sum + (convert(Number(o.estimatedFeeAmount), o.estimatedFeeCurrency) * prob) / 100;
  }, 0);

  const totalPlacementFees = placements.reduce((sum, p) => (p.feeAmount ? sum + convert(Number(p.feeAmount), p.feeCurrency) : sum), 0);
  const activeMandates = mandates.filter((m) => m.status !== "FILLED" && m.status !== "CANCELLED").length;
  const mandateAtOffer = mandates.filter((m) => m.status === "OFFER").length;

  const totalEntered = processes.length;
  const totalPlaced = processes.filter((p) => p.stage === "PLACED").length;
  const conversionPct = totalEntered > 0 ? Math.round((totalPlaced / totalEntered) * 100) : 0;

  const offersOutstanding = processes.filter((p) => p.stage === "OFFER");
  const firstOffer = offersOutstanding[0];

  const stageEverReached = (stage: string) => {
    const idx = CANDIDATE_FUNNEL_STAGES.indexOf(stage as (typeof CANDIDATE_FUNNEL_STAGES)[number]);
    return processes.filter((p) => CANDIDATE_FUNNEL_STAGES.indexOf(p.stage as (typeof CANDIDATE_FUNNEL_STAGES)[number]) >= idx || p.stage === "PLACED").length;
  };

  const byOwner = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const o of openOpportunities) {
    const ownerName = `${o.owner.firstName} ${o.owner.lastName}`;
    byOwner.set(ownerName, (byOwner.get(ownerName) ?? 0) + 1);
    bySource.set(label(o.source), (bySource.get(label(o.source)) ?? 0) + 1);
  }
  const maxByOwner = Math.max(1, ...byOwner.values());
  const maxBySource = Math.max(1, ...bySource.values());

  const mandatesByStatus = new Map<string, number>();
  for (const m of mandates) mandatesByStatus.set(m.status, (mandatesByStatus.get(m.status) ?? 0) + 1);
  const mandateOwners = new Set(mandates.map((m) => `${m.owner.firstName.slice(0, 1)}. ${m.owner.lastName}`)).size;

  const activityByType = new Map<string, number>();
  for (const a of activities) activityByType.set(label(a.type), (activityByType.get(label(a.type)) ?? 0) + 1);
  const activityUserCounts = new Map<string, number>();
  for (const a of activities) {
    const n = `${a.createdBy.firstName.slice(0, 1)}. ${a.createdBy.lastName}`;
    activityUserCounts.set(n, (activityUserCounts.get(n) ?? 0) + 1);
  }

  // Data quality (workspace-wide, not scoped to desk/period — these are "fix now" counts)
  const [unverifiedOrgs, candidatesWithoutEmployment, mandatesWithoutHiringManager] = await Promise.all([
    prisma.organization.count({ where: { workspaceId: wid, archivedAt: null, lastVerifiedAt: null } }),
    prisma.person.count({ where: { workspaceId: wid, archivedAt: null, personTypes: { has: "CANDIDATE" }, employmentHistories: { none: {} } } }),
    prisma.mandate.count({ where: { workspaceId: wid, archivedAt: null, hiringManagerPersonId: null, ...mandateWhere } }),
  ]);

  const dataQuality = [
    { count: unverifiedOrgs, label: "Organisations never verified", href: "/organisations?verified=never" },
    { count: candidatesWithoutEmployment, label: "Candidate without employment history", href: "/people?fix=no-employment" },
    { count: tasksMissing, label: "Opportunities with no next action", href: "/opportunities?fix=no-next-action" },
    { count: mandatesWithoutHiringManager, label: "Mandates without a hiring manager", href: "/mandates?fix=no-hiring-manager" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description={`Desk performance · ${new Date().getFullYear()} · ${deskLabel}`}
        actions={
          <>
            <DeskPicker options={consultants.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))} initialValue={desk} />
            <PeriodPicker current={period} />
            <Button variant="secondary" asChild>
              <a href={`/api/export/reports?period=${period}${deskUserId ? `&user=${deskUserId}` : ""}`}>
                <Download className="h-[14px] w-[14px]" /> Export
              </a>
            </Button>
          </>
        }
        user={user}
        hideDeskPicker
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Placement fees" value={formatMoney(totalPlacementFees, currency)} description={`${placements.length} placement${placements.length === 1 ? "" : "s"}`} />
        <KpiCard label="Weighted pipeline" value={formatMoney(weightedPipelineValue, currency)} description={`${openOpportunities.length} open opportunities`} />
        <KpiCard label="Active mandates" value={String(activeMandates)} description={`${mandateAtOffer} at offer`} />
        <KpiCard label="Candidate conversion" value={`${conversionPct}%`} description={`${totalPlaced} of ${totalEntered} placed`} />
        <KpiCard
          label="Offers outstanding"
          value={String(offersOutstanding.length)}
          description={firstOffer ? `${orgShortName(firstOffer.mandate.hiringOrganization.name)} · ${firstOffer.mandate.title}` : "None open"}
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <Panel title="Candidate funnel" description={`Share of the ${totalEntered} candidates entered who reached each stage`}>
          {totalEntered === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No candidates entered this period.</p>
          ) : (
            CANDIDATE_FUNNEL_STAGES.map((stage, i) => (
              <ShareBar key={stage} label={label(stage)} count={stageEverReached(stage)} total={totalEntered} highlight={i === CANDIDATE_FUNNEL_STAGES.length - 1} />
            ))
          )}
        </Panel>
        <Panel title="Opportunity pipeline" description="Open opportunities by owner and source">
          {openOpportunities.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No open opportunities this period.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">By owner</p>
                {[...byOwner.entries()].map(([k, v]) => (
                  <CountBar key={k} rowLabel={k} count={v} max={maxByOwner} />
                ))}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">By source</p>
                {[...bySource.entries()].map(([k, v]) => (
                  <CountBar key={k} rowLabel={k} count={v} max={maxBySource} />
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <Panel title="Data quality" description="Workspace-wide">
          <div className="flex flex-col">
            {dataQuality.map((d, i) => (
              <div key={d.label} className={`flex items-center justify-between gap-3 py-2.5 ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}>
                <span className="flex items-center gap-3">
                  <span className={`w-6 text-[15px] font-medium ${d.count > 0 ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"}`}>{d.count}</span>
                  <span className="text-[13px] text-[var(--color-ink2)]">{d.label}</span>
                </span>
                {d.count > 0 ? (
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={d.href}>Fix</Link>
                  </Button>
                ) : (
                  <Badge tone="success">All good</Badge>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Mandates by status" description={`${mandates.length} mandate${mandates.length === 1 ? "" : "s"} · ${mandateOwners} owner${mandateOwners === 1 ? "" : "s"}`}>
          {mandates.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No mandates this period.</p>
          ) : (
            <div className="flex flex-col">
              {[...mandatesByStatus.entries()].map(([status, count], i) => (
                <div key={status} className={`flex items-center justify-between py-2 text-[13.5px] ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}>
                  <span>{label(status)}</span>
                  <span className="text-[var(--color-muted)]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Activity logged" description={`${activities.length} this period · ${[...activityUserCounts.entries()].map(([k, v]) => `${v} ${k}`).join(", ") || "none"}`}>
          {activities.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No activity logged this period.</p>
          ) : (
            <div className="flex flex-col">
              {[...activityByType.entries()].map(([type, count], i) => (
                <div key={type} className={`flex items-center justify-between py-2 text-[13.5px] ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}>
                  <span>{type}</span>
                  <span className="text-[var(--color-muted)]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Monetary totals are converted using manually maintained exchange rates (Settings &gt; Workspace) — there is no live FX feed. Portfolio coverage, time-to-fill and
        source-to-placement will become separate report pages linked from here.
      </p>
    </div>
  );
}
