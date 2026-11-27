import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { DeskPicker } from "@/components/shell/desk-picker";
import { GlobalSearch } from "@/components/shell/global-search";
import { TaskIndicator } from "@/components/shell/task-indicator";
import { QuickCreate } from "@/components/shell/quick-create";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { formatConvertedMoney, cn } from "@/lib/utils";
import { normalizeExchangeRates, convertedTotal } from "@/lib/currency";
import { label, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import {
  OPEN_OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_SHORT_LABEL,
  LIVE_MANDATE_STATUSES,
  MANDATE_STATUS_SHORT_LABEL,
  MANDATE_STAGE_AXIS_LABELS,
  INTELLIGENCE_TYPE_SHORT_LABEL,
  mandateStagePosition,
  weightedOpportunityValue,
  isCandidateInPlay,
  hasNoRecentActivity,
  orgShortName,
} from "@/lib/rules";
import type { CandidateProcessStage } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

function roundWord(stage: CandidateProcessStage) {
  if (stage === "FIRST_INTERVIEW") return "first";
  if (stage === "FURTHER_INTERVIEW") return "second";
  if (stage === "FINAL_INTERVIEW") return "final";
  return "latest";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const wid = user.workspaceId;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const mandateWhere = mandateVisibilityWhere(user);
  const [workspace, cookieStore, consultants] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: wid }, select: { defaultCurrency: true, exchangeRatesToGbp: true } }),
    cookies(),
    prisma.user.findMany({ where: { workspaceId: wid, active: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);
  const displayCurrency = workspace.defaultCurrency;
  const ratesToGbp = normalizeExchangeRates(workspace.exchangeRatesToGbp);
  const deskOptions = consultants.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }));

  const [
    overdueTasksCount,
    oldestOverdueTask,
    waitingCandidates,
    offersToChase,
    oppsNoNextStep,
    upcomingInterviews,
    stalledInterview,
    placementsThisYear,
    liveMandatesAll,
    outstandingOffers,
    awaitingFeedback,
    openOpportunities,
    signals,
    newSignalsCount,
  ] = await Promise.all([
    prisma.task.count({
      where: { workspaceId: wid, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { lt: startOfToday } },
    }),
    prisma.task.findFirst({
      where: { workspaceId: wid, archivedAt: null, status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { lt: startOfToday } },
      orderBy: { dueDate: "asc" },
      select: { title: true, dueDate: true },
    }),
    prisma.candidateProcess.findMany({
      where: {
        stage: { in: ["CONTACT_REQUIRED", "CONTACTED", "INTERESTED"] },
        mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere },
      },
      select: {
        candidatePerson: { select: { firstName: true, lastName: true } },
        activities: { select: { activity: { select: { occurredAt: true } } } },
      },
    }),
    prisma.offer.findMany({
      where: {
        status: { in: ["MADE", "NEGOTIATING"] },
        candidateResponseDate: null,
        offerDate: { lte: threeDaysAgo },
        candidateProcess: { mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere } },
      },
      orderBy: { offerDate: "asc" },
      select: {
        candidateProcess: { select: { mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } } },
      },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null, stage: { notIn: ["WON", "LOST"] }, primaryNextTaskId: null },
      orderBy: { updatedAt: "desc" },
      select: { hiringOrganization: { select: { name: true } } },
    }),
    prisma.interview.findMany({
      where: {
        scheduledStart: { gte: now, lte: in7Days },
        outcome: "SCHEDULED",
        candidateProcess: { mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere } },
      },
      orderBy: { scheduledStart: "asc" },
      select: { scheduledStart: true, candidateProcess: { select: { candidatePerson: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.candidateProcess.findFirst({
      where: {
        stage: { in: ["FIRST_INTERVIEW", "FURTHER_INTERVIEW", "FINAL_INTERVIEW"] },
        mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere },
        interviews: { none: { scheduledStart: { gte: now }, outcome: "SCHEDULED" } },
      },
      select: { stage: true, mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } },
    }),
    prisma.placement.findMany({
      where: { mandate: { workspaceId: wid }, placementDate: { gte: startOfYear } },
      select: { feeAmount: true, feeCurrency: true },
    }),
    prisma.mandate.findMany({
      where: { workspaceId: wid, archivedAt: null, status: { in: [...LIVE_MANDATE_STATUSES] }, ...mandateWhere },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        hiringOrganization: { select: { name: true } },
        candidateProcesses: { select: { stage: true } },
      },
    }),
    prisma.offer.findMany({
      where: {
        status: { in: ["PLANNED", "MADE", "NEGOTIATING"] },
        candidateProcess: { mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        candidateProcess: { select: { mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } } },
      },
    }),
    prisma.candidateProcess.findMany({
      where: {
        mandate: { workspaceId: wid, archivedAt: null, ...mandateWhere },
        interviews: { some: { outcome: "AWAITING_FEEDBACK" } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        stage: true,
        candidatePerson: { select: { firstName: true, lastName: true } },
        mandate: { select: { hiringOrganization: { select: { name: true } } } },
      },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId: wid, archivedAt: null, stage: { in: OPEN_OPPORTUNITY_STAGES } },
      select: { stage: true, estimatedFeeAmount: true, estimatedFeeCurrency: true, probabilityOverride: true, isProbabilityOverridden: true },
    }),
    prisma.intelligenceItem.findMany({
      where: { workspaceId: wid, archivedAt: null, reviewState: "ACCEPTED" },
      orderBy: { dateReceived: "desc" },
      take: 3,
      select: { id: true, title: true, type: true, confidence: true, commercialRelevance: true, dateReceived: true },
    }),
    prisma.intelligenceItem.count({ where: { workspaceId: wid, archivedAt: null, reviewState: "ACCEPTED", dateReceived: { gte: oneWeekAgo } } }),
  ]);

  // --- Today ---------------------------------------------------------------

  const waitingOnYou = waitingCandidates.filter((c) =>
    hasNoRecentActivity(c.activities.map((a) => a.activity.occurredAt), 3, now),
  );
  const waitingNames = waitingOnYou.slice(0, 2).map((c) => `${c.candidatePerson.firstName} ${c.candidatePerson.lastName}`);
  const waitingDetail =
    waitingOnYou.length === 0
      ? "Nobody waiting right now"
      : waitingOnYou.length > 2
        ? `${waitingNames.join(", ")} and ${waitingOnYou.length - 2} more waiting on you`
        : `${waitingNames.join(" and ")} waiting on you`;

  const oppNames = oppsNoNextStep.slice(0, 3).map((o) => o.hiringOrganization.name);
  const oppDetail =
    oppsNoNextStep.length === 0
      ? "Every open opportunity has a next step"
      : `${oppNames.join(", ")}${oppsNoNextStep.length > 3 ? ` and ${oppsNoNextStep.length - 3} more` : ""}`;

  const offerToChase = offersToChase[0];
  const offerDetail = offerToChase
    ? `${orgShortName(offerToChase.candidateProcess.mandate.hiringOrganization.name)} · ${offerToChase.candidateProcess.mandate.title}`
    : "Nothing to chase";

  const interviewDetail = (() => {
    const first = upcomingInterviews[0];
    if (first) {
      const name = `${first.candidateProcess.candidatePerson.firstName} ${first.candidateProcess.candidatePerson.lastName}`;
      return `${name} · ${format(first.scheduledStart, "EEEE")}`;
    }
    if (stalledInterview) {
      return `${orgShortName(stalledInterview.mandate.hiringOrganization.name)} ${stalledInterview.mandate.title} · ${roundWord(stalledInterview.stage)} round still to schedule`;
    }
    return "Nothing scheduled this week";
  })();

  const oldestOverdueDetail = oldestOverdueTask
    ? `Oldest: ${oldestOverdueTask.title}, due ${format(oldestOverdueTask.dueDate, "d MMM")}`
    : "You're clear";

  const todayRows = [
    { count: overdueTasksCount, label: "Overdue tasks", detail: oldestOverdueDetail, href: "/tasks?filter=overdue", tone: "warn" as const },
    { count: waitingOnYou.length, label: "Candidates waiting on you", detail: waitingDetail, href: "/mandates", tone: "ink" as const },
    { count: offersToChase.length, label: "Offers to chase", detail: offerDetail, href: "/mandates", tone: "ink" as const },
    { count: oppsNoNextStep.length, label: "Opportunities with no next step", detail: oppDetail, href: "/opportunities", tone: "ink" as const },
    { count: upcomingInterviews.length, label: "Interviews this week", detail: interviewDetail, href: "/mandates", tone: "ink" as const },
  ];

  // --- KPIs ------------------------------------------------------------------

  const feesPlacedThisYear = convertedTotal(
    placementsThisYear.filter((p) => p.feeAmount).map((p) => ({ amount: Number(p.feeAmount), currency: p.feeCurrency })),
    displayCurrency,
    ratesToGbp,
  );

  const candidatesInPlayTotal = liveMandatesAll.reduce(
    (sum, m) => sum + m.candidateProcesses.filter((c) => isCandidateInPlay(c.stage)).length,
    0,
  );

  const offerWhich = outstandingOffers[0];
  const awaitingWhich = awaitingFeedback[0];

  const kpis = [
    {
      title: "Fees placed",
      value: formatConvertedMoney(feesPlacedThisYear.amount, feesPlacedThisYear.approx, displayCurrency),
      detail: `${placementsThisYear.length} placement${placementsThisYear.length === 1 ? "" : "s"} in ${now.getFullYear()}`,
      detailTone: "pos" as const,
      href: "/reports",
    },
    {
      title: "Live mandates",
      value: String(liveMandatesAll.length),
      detail: `${candidatesInPlayTotal} candidate${candidatesInPlayTotal === 1 ? "" : "s"} in play`,
      detailTone: "muted" as const,
      href: "/mandates",
    },
    {
      title: "Offers outstanding",
      value: String(outstandingOffers.length),
      detail: offerWhich
        ? `${orgShortName(offerWhich.candidateProcess.mandate.hiringOrganization.name)} · ${offerWhich.candidateProcess.mandate.title}`
        : "None outstanding",
      detailTone: "muted" as const,
      href: "/mandates",
    },
    {
      title: "Awaiting client feedback",
      value: String(awaitingFeedback.length),
      detail: awaitingWhich
        ? `${awaitingWhich.candidatePerson.firstName} ${awaitingWhich.candidatePerson.lastName} · ${orgShortName(awaitingWhich.mandate.hiringOrganization.name)} ${roundWord(awaitingWhich.stage)}`
        : "None waiting",
      detailTone: "muted" as const,
      href: "/mandates",
    },
  ];

  // --- Live mandates panel -----------------------------------------------

  const liveMandatePanelRows = liveMandatesAll.slice(0, 4).map((m) => ({
    id: m.id,
    title: m.title,
    org: m.hiringOrganization.name,
    candidateCount: m.candidateProcesses.filter((c) => isCandidateInPlay(c.stage)).length,
    position: mandateStagePosition(m.status as (typeof LIVE_MANDATE_STATUSES)[number]),
    stageLabel: MANDATE_STATUS_SHORT_LABEL[m.status as (typeof LIVE_MANDATE_STATUSES)[number]] ?? label(m.status),
  }));

  // --- Weighted pipeline ---------------------------------------------------

  const stageTotals = new Map<string, number>();
  const stageApprox = new Map<string, boolean>();
  for (const stage of OPEN_OPPORTUNITY_STAGES) {
    stageTotals.set(stage, 0);
    stageApprox.set(stage, false);
  }
  let pipelineApprox = false;
  for (const o of openOpportunities) {
    const { amount, approx } = convertedTotal([{ amount: weightedOpportunityValue(o), currency: o.estimatedFeeCurrency }], displayCurrency, ratesToGbp);
    if (approx) {
      pipelineApprox = true;
      stageApprox.set(o.stage, true);
    }
    stageTotals.set(o.stage, (stageTotals.get(o.stage) ?? 0) + amount);
  }
  const weightedTotal = [...stageTotals.values()].reduce((a, b) => a + b, 0);
  const maxStageWeighted = Math.max(...stageTotals.values(), 0);
  const pipelineRows = [...OPEN_OPPORTUNITY_STAGES]
    .reverse()
    .map((stage) => ({
      stage,
      label: OPPORTUNITY_STAGE_SHORT_LABEL[stage] ?? label(stage),
      probability: OPPORTUNITY_STAGE_PROBABILITY[stage] ?? 0,
      value: stageTotals.get(stage) ?? 0,
      approx: stageApprox.get(stage) ?? false,
      widthPct: maxStageWeighted > 0 ? ((stageTotals.get(stage) ?? 0) / maxStageWeighted) * 100 : 0,
      isMax: maxStageWeighted > 0 && (stageTotals.get(stage) ?? 0) === maxStageWeighted,
    }));

  // --- Market signals --------------------------------------------------------

  const confidenceLabel: Record<string, string> = {
    VERIFIED: "Verified",
    PARTIALLY_VERIFIED: "Partially verified",
    UNVERIFIED: "Unverified",
  };

  return (
    <div className="-mx-3 -mb-4 -mt-2.5 flex flex-1 flex-col gap-3.5">
      <header className="flex flex-none flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-light leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {greeting}, {user.firstName}
          </h1>
          <div className="mt-[3px] text-[13px] text-[var(--color-muted)]">Desk overview · {format(now, "EEEE d MMMM")}</div>
        </div>
        <div data-toolbar className="flex flex-wrap items-center gap-2">
          <DeskPicker options={deskOptions} initialValue={cookieStore.get(DESK_COOKIE)?.value ?? ""} />
          <GlobalSearch />
          <TaskIndicator user={user} />
          <QuickCreate />
        </div>
      </header>

      <section aria-label="Desk figures" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="flex flex-col gap-2 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4 text-[var(--color-ink)] no-underline"
          >
            <span className="text-[13px] text-[var(--color-ink2)]">{kpi.title}</span>
            <span className="text-[30px] font-light leading-none tracking-[-0.03em]">{kpi.value}</span>
            <span
              className={cn(
                "truncate text-xs",
                kpi.detailTone === "pos" ? "text-[var(--color-pos)]" : "text-[var(--color-muted)]",
              )}
            >
              {kpi.detail}
            </span>
          </Link>
        ))}
      </section>

      <section className="flex min-h-[280px] flex-1 flex-wrap gap-3.5">
        <div className="flex min-w-0 flex-[5_1_360px] flex-col rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-2.5 pt-[18px]">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[15px] font-medium">Today</h2>
            <Link href="/tasks" className="text-[12.5px] text-[var(--color-ink2)] no-underline">
              Open work queue →
            </Link>
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-between">
            {todayRows.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center gap-4 border-t border-[var(--color-line)] py-2 text-[var(--color-ink)] no-underline"
              >
                <span
                  className={cn(
                    "w-[34px] shrink-0 text-2xl font-light leading-none tracking-[-0.02em]",
                    row.tone === "warn" && row.count > 0 ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]",
                  )}
                >
                  {row.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px]">{row.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{row.detail}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" strokeWidth={1.8} />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-[7_1_460px] flex-col rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-4 pt-[18px]">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[15px] font-medium">Live mandates</h2>
            <Link href="/mandates" className="text-[12.5px] text-[var(--color-ink2)] no-underline">
              All mandates →
            </Link>
          </div>
          <div className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">Stage reached, brief to offer</div>
          <div className="mt-1.5 flex flex-1 flex-col justify-around">
            {liveMandatePanelRows.length === 0 ? (
              <p className="py-6 text-sm text-[var(--color-muted)]">No live mandates yet.</p>
            ) : (
              liveMandatePanelRows.map((m) => (
                <Link
                  key={m.id}
                  href={`/mandates/${m.id}`}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_64px] items-center gap-5 text-[var(--color-ink)] no-underline"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px]">{m.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                      {m.org} · {m.candidateCount} candidate{m.candidateCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="relative flex h-3.5 items-center">
                    <span className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--color-track)]" />
                    <span className="absolute h-1.5 rounded-full bg-[var(--color-fill)]" style={{ width: `${m.position}%` }} />
                    <span
                      className="absolute h-3.5 w-3.5 rounded-full bg-[var(--color-dot)]"
                      style={{ left: `calc(${m.position}% - 7px)` }}
                    />
                  </span>
                  <span className="text-right text-[12.5px] text-[var(--color-ink2)]">{m.stageLabel}</span>
                </Link>
              ))
            )}
          </div>
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_64px] gap-5 border-t border-[var(--color-line)] pt-2.5 text-[11px] text-[var(--color-muted)]">
            <span>
              {candidatesInPlayTotal} candidate{candidatesInPlayTotal === 1 ? "" : "s"} in play
            </span>
            <span className="flex justify-between">
              {MANDATE_STAGE_AXIS_LABELS.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
            <span />
          </div>
        </div>
      </section>

      <section className="flex min-h-[260px] flex-1 flex-wrap gap-3.5">
        <div className="flex min-w-0 flex-[7_1_460px] flex-col rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-4 pt-[18px]">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="m-0 text-[15px] font-medium">Weighted pipeline</h2>
              <div className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                {openOpportunities.length} open opportunit{openOpportunities.length === 1 ? "y" : "ies"} · value × stage probability
              </div>
            </div>
            <span className="text-[26px] font-light leading-none tracking-[-0.03em]">{formatConvertedMoney(weightedTotal, pipelineApprox, displayCurrency)}</span>
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-around">
            {pipelineRows.map((row) => (
              <div key={row.stage} className="grid grid-cols-[210px_minmax(0,1fr)_70px] items-center gap-4 text-[13px]">
                <span className="text-[var(--color-ink2)]">
                  {row.label}
                  <span className="text-[var(--color-muted)]"> · {row.probability}% likely</span>
                </span>
                <span className="block h-1.5 rounded-full bg-[var(--color-track)]">
                  <span
                    className={cn("block h-1.5 rounded-full", row.isMax ? "bg-[var(--color-dot)]" : "bg-[var(--color-bar)]")}
                    style={{ width: `${row.widthPct}%` }}
                  />
                </span>
                <span className="text-right">{formatConvertedMoney(row.value, row.approx, displayCurrency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-[5_1_360px] flex-col rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-3.5 pt-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-medium">Market signals</h2>
            {newSignalsCount > 0 ? (
              <span className="rounded-[4px] bg-[var(--color-chip-strong)] px-[11px] py-0.5 text-xs text-[var(--color-chip-strong-ink)]">
                {newSignalsCount} new
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-between">
            {signals.length === 0 ? (
              <p className="py-6 text-sm text-[var(--color-muted)]">No signals logged yet.</p>
            ) : (
              signals.map((s) => (
                <Link
                  key={s.id}
                  href="/intelligence"
                  className="flex items-start gap-3.5 border-t border-[var(--color-line)] py-2.5 text-[var(--color-ink)] no-underline"
                >
                  <span className="w-[92px] shrink-0 truncate whitespace-nowrap rounded-[4px] bg-[var(--color-chip)] px-1 py-0.5 text-center text-[11.5px] text-[var(--color-ink2)]">
                    {INTELLIGENCE_TYPE_SHORT_LABEL[s.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px]">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                      {confidenceLabel[s.confidence]} · {label(s.commercialRelevance)} · {format(s.dateReceived, "d MMM")}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="flex justify-between border-t border-[var(--color-line)] pt-2.5 text-xs text-[var(--color-muted)]">
            <span>Logged by your team</span>
            <Link href="/intelligence" className="text-[var(--color-ink2)] no-underline">
              Connect feeds →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
