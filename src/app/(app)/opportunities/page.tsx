import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { opportunityViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { FixBanner } from "@/components/shell/fix-banner";
import { UndoDeleteToast } from "@/components/shell/undo-delete-toast";
import { nextActionStatus } from "@/lib/next-action-status";
import { formatMoney } from "@/lib/utils";
import { OPEN_OPPORTUNITY_STAGES, CLOSED_OPPORTUNITY_STAGES, weightedOpportunityValue, daysAtStage } from "@/lib/rules";
import { OpportunitiesView } from "./opportunities-view";
import type { BoardOpportunity } from "./opportunity-board";
import type { ClosedOpportunity } from "./opportunities-view";
import type { OpportunityListRow } from "./opportunities-table";
import type { Prisma } from "@prisma/client";

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
    include: { hiringOrganization: { select: { name: true } }, owner: { select: { firstName: true, lastName: true } }, primaryNextTask: { select: { title: true, dueDate: true } } },
  });

  const openOpportunitiesRaw = opportunities.filter((o) => (OPEN_OPPORTUNITY_STAGES as string[]).includes(o.stage));
  const closedOpportunitiesRaw = opportunities.filter((o) => (CLOSED_OPPORTUNITY_STAGES as string[]).includes(o.stage));

  const stageWeighted = new Map<string, number>();
  for (const o of openOpportunitiesRaw) {
    const w = weightedOpportunityValue(o);
    stageWeighted.set(o.stage, (stageWeighted.get(o.stage) ?? 0) + w);
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
    // The one known anomaly (section 5 rule 3): a mandate already exists although the
    // opportunity is still showing in an open stage — offer a one-click reconciliation.
    hasLiveMandate: Boolean(o.wonMandateId),
    nextActionStatus: nextActionStatus(o.primaryNextTask?.dueDate),
  }));

  const closedOpportunities: ClosedOpportunity[] = closedOpportunitiesRaw.map((o) => ({
    id: o.id,
    name: o.name,
    organizationName: o.hiringOrganization.name,
    stage: o.stage,
    estimatedFeeAmount: o.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: o.estimatedFeeCurrency,
  }));

  const listRows: OpportunityListRow[] = opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    organizationName: o.hiringOrganization.name,
    stage: o.stage,
    probability: o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : o.stageProbabilityDefault,
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
            {openOpportunitiesRaw.length} open · <span className="text-[var(--color-ink)]">{formatMoney(totalWeighted, "GBP")}</span> weighted · business development
            pipeline
          </>
        }
      />
      {fix === "no-next-action" ? <FixBanner label="Opportunities with no next action" clearHref="/opportunities" /> : null}
      <OpportunitiesView display={fix ? "table" : display} openOpportunities={openOpportunities} maxOpenWeighted={maxOpenWeighted} closedOpportunities={closedOpportunities} listRows={listRows} />
      <UndoDeleteToast type="OPPORTUNITY" />
    </div>
  );
}
