import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { opportunityViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { FixBanner } from "@/components/shell/fix-banner";
import { UndoDeleteToast } from "@/components/shell/undo-delete-toast";
import { nextActionStatus } from "@/lib/next-action-status";
import { formatConvertedMoney } from "@/lib/utils";
import { normalizeExchangeRates, convertedTotal } from "@/lib/currency";
import { OPEN_OPPORTUNITY_STAGES, CLOSED_OPPORTUNITY_STAGES, weightedOpportunityValue, daysAtStage } from "@/lib/rules";
import { OpportunitiesView } from "./opportunities-view";
import type { BoardOpportunity } from "./opportunity-board";
import type { ClosedOpportunity } from "./opportunities-view";
import type { OpportunityListRow } from "./opportunities-table";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const display = sp.display === "table" ? "table" : "board";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;

  const activeView = viewId ? await prisma.savedView.findUnique({ where: { id: viewId } }) : null;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { defaultCurrency: true, exchangeRatesToGbp: true } });
  const displayCurrency = workspace.defaultCurrency;
  const ratesToGbp = normalizeExchangeRates(workspace.exchangeRatesToGbp);

  const where: Prisma.OpportunityWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (activeView) Object.assign(where, opportunityViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const fix = typeof sp.fix === "string" ? sp.fix : undefined;
  if (fix === "no-next-action") {
    where.stage = { in: OPEN_OPPORTUNITY_STAGES };
    where.primaryNextTaskId = null;
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      hiringOrganization: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      primaryNextTask: { select: { title: true, dueDate: true } },
      wonMandate: { select: { id: true, status: true } },
    },
  });

  // An opportunity already linked to a mandate is resolved — it belongs in the Closed tray with a
  // link to the live search, never back in the open pipeline, whatever its stage field reads.
  const openOpportunitiesRaw = opportunities.filter((o) => (OPEN_OPPORTUNITY_STAGES as string[]).includes(o.stage) && !o.wonMandateId);
  const closedOpportunitiesRaw = opportunities.filter((o) => (CLOSED_OPPORTUNITY_STAGES as string[]).includes(o.stage) || o.wonMandateId);

  const stageWeighted = new Map<string, number>();
  let totalApprox = false;
  for (const o of openOpportunitiesRaw) {
    const { amount, approx } = convertedTotal([{ amount: weightedOpportunityValue(o), currency: o.estimatedFeeCurrency }], displayCurrency, ratesToGbp);
    if (approx) totalApprox = true;
    stageWeighted.set(o.stage, (stageWeighted.get(o.stage) ?? 0) + amount);
  }
  const maxOpenWeighted = Math.max(0, ...stageWeighted.values());
  const totalWeighted = [...stageWeighted.values()].reduce((a, b) => a + b, 0);

  const openOpportunities: BoardOpportunity[] = openOpportunitiesRaw.map((o) => ({
    id: o.id,
    name: o.name,
    stage: o.stage,
    organizationName: o.hiringOrganization.name,
    potentialRoleTitle: o.potentialRoleTitle,
    estimatedFeeAmount: o.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: o.estimatedFeeCurrency,
    weightedValue: weightedOpportunityValue(o),
    nextActionStatus: nextActionStatus(o.primaryNextTask?.dueDate),
  }));

  const closedOpportunities: ClosedOpportunity[] = closedOpportunitiesRaw.map((o) => ({
    id: o.id,
    name: o.name,
    organizationName: o.hiringOrganization.name,
    stage: o.stage,
    estimatedFeeAmount: o.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: o.estimatedFeeCurrency,
    mandateId: o.wonMandate?.id ?? null,
    mandateStatus: o.wonMandate?.status ?? null,
  }));

  const listRows: OpportunityListRow[] = opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    organizationName: o.hiringOrganization.name,
    stage: o.stage,
    estimatedFeeAmount: o.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: o.estimatedFeeCurrency,
    weightedValue: weightedOpportunityValue(o),
    ownerName: `${o.owner.firstName} ${o.owner.lastName}`,
    daysAtStage: daysAtStage(o.stageEnteredAt),
    nextStepText: o.primaryNextTask?.title ?? null,
    nextActionStatus: nextActionStatus(o.primaryNextTask?.dueDate),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Opportunities"
        description={
          <>
            {openOpportunitiesRaw.length} open · <span className="text-[var(--color-ink)]">{formatConvertedMoney(totalWeighted, totalApprox, displayCurrency)}</span> in likely fees
          </>
        }
        user={user}
      />
      {fix === "no-next-action" ? <FixBanner label="Opportunities with no next action" clearHref="/opportunities" /> : null}
      <OpportunitiesView
        display={fix ? "table" : display}
        openOpportunities={openOpportunities}
        maxOpenWeighted={maxOpenWeighted}
        closedOpportunities={closedOpportunities}
        listRows={listRows}
        displayCurrency={displayCurrency}
        ratesToGbp={ratesToGbp}
      />
      <UndoDeleteToast type="OPPORTUNITY" />
    </div>
  );
}
