import Link from "next/link";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { opportunityViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, cn } from "@/lib/utils";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { nextActionStatus } from "@/lib/next-action-status";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { OpportunityBoard, type BoardOpportunity } from "./opportunity-board";
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

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "OPPORTUNITY" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.OpportunityWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (activeView) Object.assign(where, opportunityViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { hiringOrganization: true, owner: true, primaryNextTask: true },
  });

  const boardData: BoardOpportunity[] = opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    stage: o.stage,
    organizationName: o.hiringOrganization.name,
    potentialRoleTitle: o.potentialRoleTitle,
    estimatedFeeAmount: o.estimatedFeeAmount?.toString() ?? null,
    estimatedFeeCurrency: o.estimatedFeeCurrency,
    probability: o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : (OPPORTUNITY_STAGE_PROBABILITY[o.stage] ?? 0),
    ownerName: `${o.owner.firstName} ${o.owner.lastName}`,
    expectedDecisionDate: o.expectedDecisionDate?.toISOString() ?? null,
    nextActionStatus: nextActionStatus(o.primaryNextTask?.dueDate),
  }));

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description={`${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <div className="flex overflow-hidden rounded-md border border-[var(--color-border-strong)]">
              <Link
                href="?display=board"
                className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs", display === "board" ? "bg-[var(--color-canvas)]" : "")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </Link>
              <Link
                href="?display=table"
                className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--color-border-strong)]", display === "table" ? "bg-[var(--color-canvas)]" : "")}
              >
                <ListIcon className="h-3.5 w-3.5" /> Table
              </Link>
            </div>
            <Button asChild>
              <Link href="/opportunities/new">
                <Plus className="h-4 w-4" /> New opportunity
              </Link>
            </Button>
          </>
        }
      />

      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities"
          action={
            <Button asChild size="sm" className="mt-2">
              <Link href="/opportunities/new">
                <Plus className="h-4 w-4" /> New opportunity
              </Link>
            </Button>
          }
        />
      ) : display === "board" ? (
        <OpportunityBoard
          key={opportunities.map((o) => `${o.id}:${o.stage}`).join(",")}
          initialOpportunities={boardData}
        />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Estimated fee</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    <Link href={`/opportunities/${o.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                      {o.name}
                    </Link>
                  </TableCell>
                  <TableCell>{o.hiringOrganization.name}</TableCell>
                  <TableCell>
                    <StatusBadge value={o.stage} />
                  </TableCell>
                  <TableCell>{o.isProbabilityOverridden ? o.probabilityOverride : o.stageProbabilityDefault}%</TableCell>
                  <TableCell>{formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)}</TableCell>
                  <TableCell>{o.owner.firstName} {o.owner.lastName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <NextActionDot status={nextActionStatus(o.primaryNextTask?.dueDate)} />
                      {o.primaryNextTask ? o.primaryNextTask.title : <span className="text-[var(--color-ink-subtle)]">No next action</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
