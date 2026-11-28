import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { mandateViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { FixBanner } from "@/components/shell/fix-banner";
import { nextActionStatus } from "@/lib/next-action-status";
import {
  LIVE_MANDATE_STATUSES,
  CLOSED_MANDATE_STATUSES,
  mandateStageBarStep,
  mandateBoardColumn,
  mandateBoardCardLine,
  isCandidateHidden,
  summariseCandidateProcesses,
} from "@/lib/rules";
import { label } from "@/lib/labels";
import { formatConvertedMoney, convertedLabel } from "@/lib/utils";
import { normalizeExchangeRates, convertedTotal } from "@/lib/currency";
import { DESK_COOKIE } from "@/lib/desk-cookie";
import { PRACTICES, PRACTICE_LABEL, type Practice } from "@/lib/practices";
import { MandatesView } from "./mandates-view";
import type { BoardMandate } from "./mandate-board";
import type { ClosedMandate } from "./mandates-view";
import type { MandateListRow } from "./mandates-list";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mandates" };

/** Round 4 "Portfolio company" addition: pipeline cards/rows show "Client · Portfolio company" when the two differ. */
function clientLabel(m: { hiringOrganization: { name: string }; portfolioCompany: { name: string } | null }) {
  return m.portfolioCompany ? `${m.hiringOrganization.name} · ${m.portfolioCompany.name}` : m.hiringOrganization.name;
}

/** A mandate's own likely fee: the agreed fixed fee if set, else an estimate from its fee percentage and base range. */
function mandateLikelyFee(m: {
  fixedFeeAmount: unknown;
  fixedFeeCurrency: string | null;
  feePercentage: unknown;
  minBaseAmount: unknown;
  maxBaseAmount: unknown;
  baseCurrency: string | null;
}): { amount: number; currency: string } | null {
  if (m.fixedFeeAmount) return { amount: Number(m.fixedFeeAmount as { toString(): string }), currency: m.fixedFeeCurrency ?? "GBP" };
  const min = m.minBaseAmount ? Number(m.minBaseAmount as { toString(): string }) : null;
  const max = m.maxBaseAmount ? Number(m.maxBaseAmount as { toString(): string }) : null;
  const percentage = m.feePercentage ? Number(m.feePercentage as { toString(): string }) : null;
  if (percentage && (min || max)) {
    const midpoint = min && max ? (min + max) / 2 : (min ?? max ?? 0);
    return { amount: (midpoint * percentage) / 100, currency: m.baseCurrency ?? "GBP" };
  }
  return null;
}

export default async function MandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const display = sp.display === "list" ? "list" : "board";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;
  const practiceFilter = PRACTICES.includes(sp.practice as Practice) ? (sp.practice as Practice) : undefined;

  const [activeView, workspace, cookieStore, consultants, practiceAreaFilter] = await Promise.all([
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { defaultCurrency: true, exchangeRatesToGbp: true } }),
    cookies(),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
    practiceFilter
      ? prisma.practiceArea.findUnique({ where: { workspaceId_name: { workspaceId: user.workspaceId, name: PRACTICE_LABEL[practiceFilter] } }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  const displayCurrency = workspace.defaultCurrency;
  const ratesToGbp = normalizeExchangeRates(workspace.exchangeRatesToGbp);
  const deskOptions = consultants.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }));
  const deskValue = cookieStore.get(DESK_COOKIE)?.value ?? "";

  const where: Prisma.MandateWhereInput = { workspaceId: user.workspaceId, archivedAt: null, ...mandateVisibilityWhere(user) };
  if (activeView) Object.assign(where, mandateViewWhere(activeView.filterJson as Record<string, unknown>, user.id));
  if (deskValue === "me") where.ownerId = user.id;
  else if (deskValue) where.ownerId = deskValue;
  if (practiceAreaFilter) where.practiceAreaId = practiceAreaFilter.id;

  const fix = typeof sp.fix === "string" ? sp.fix : undefined;
  if (fix === "no-hiring-manager") where.hiringManagerPersonId = null;

  const mandates = await prisma.mandate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      priority: true,
      targetCompletionDate: true,
      fixedFeeAmount: true,
      fixedFeeCurrency: true,
      feePercentage: true,
      minBaseAmount: true,
      maxBaseAmount: true,
      baseCurrency: true,
      hiringOrganization: { select: { name: true } },
      portfolioCompany: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      candidateProcesses: { select: { stage: true } },
      primaryNextTask: { select: { title: true, dueDate: true } },
    },
  });

  const now = new Date();
  const liveMandates = mandates.filter((m) => (LIVE_MANDATE_STATUSES as readonly string[]).includes(m.status));
  const closedMandatesRaw = mandates.filter((m) => (CLOSED_MANDATE_STATUSES as string[]).includes(m.status));

  const boardData: BoardMandate[] = liveMandates.map((m) => {
    const stages = m.candidateProcesses.map((p) => p.stage);
    return {
      id: m.id,
      reference: m.reference,
      title: m.title,
      column: mandateBoardColumn(stages),
      organizationName: clientLabel(m),
      cardLine: mandateBoardCardLine(stages),
    };
  });

  const closedMandates: ClosedMandate[] = closedMandatesRaw.map((m) => ({
    id: m.id,
    title: m.title,
    organizationName: clientLabel(m),
    status: m.status,
  }));

  const listRows: MandateListRow[] = mandates.map((m) => {
    const visibleStages = m.candidateProcesses.map((p) => p.stage);
    const candidateCount = visibleStages.filter((s) => !isCandidateHidden(s)).length;
    const step = mandateStageBarStep(m.status);
    const status = nextActionStatus(m.primaryNextTask?.dueDate);
    const targetDatePassed = Boolean(m.targetCompletionDate && m.targetCompletionDate < now && m.status !== "FILLED");
    return {
      id: m.id,
      title: m.title,
      organizationName: clientLabel(m),
      isCritical: m.priority === "CRITICAL",
      stageLabel: label(m.status),
      stepLabel: `Step ${step} of 7`,
      targetDatePassed,
      candidateCount,
      candidateSummary: summariseCandidateProcesses(visibleStages),
      nextStepText: m.primaryNextTask?.title ?? null,
      nextActionStatus: status,
      ownerName: `${m.owner.firstName} ${m.owner.lastName}`,
    };
  });

  const interviewingCount = boardData.filter((m) => m.column === "Interviews").length;
  const fees = liveMandates
    .map(mandateLikelyFee)
    .filter((f): f is { amount: number; currency: string } => f !== null)
    .map((f) => ({ amount: f.amount, currency: f.currency }));
  const feesTotal = convertedTotal(fees, displayCurrency, ratesToGbp);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Mandates"
        description={
          <>
            {liveMandates.length} live · {interviewingCount} interviewing ·{" "}
            <span className="text-[var(--color-ink)]">{formatConvertedMoney(feesTotal.amount, feesTotal.approx, displayCurrency)}</span>{" "}
            {convertedLabel("in fees", feesTotal.approx, displayCurrency)}
          </>
        }
        user={user}
      />
      {fix === "no-hiring-manager" ? <FixBanner label="Mandates without a hiring manager" clearHref="/mandates" /> : null}
      <MandatesView
        display={fix ? "list" : display}
        liveMandates={boardData}
        closedMandates={closedMandates}
        listRows={listRows}
        deskOptions={deskOptions}
        deskValue={deskValue}
        practiceFilter={practiceFilter}
      />
    </div>
  );
}
