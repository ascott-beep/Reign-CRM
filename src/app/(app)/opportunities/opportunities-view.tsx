"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List as ListIcon, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, cn } from "@/lib/utils";
import { OpportunityBoard, type BoardOpportunity } from "./opportunity-board";
import { OpportunitiesTable, type OpportunityListRow } from "./opportunities-table";

export type ClosedOpportunity = { id: string; name: string; organizationName: string; stage: string; estimatedFeeAmount: string | null; estimatedFeeCurrency: string | null };

export function OpportunitiesView({
  display,
  openOpportunities,
  maxOpenWeighted,
  closedOpportunities,
  listRows,
}: {
  display: "board" | "table";
  openOpportunities: BoardOpportunity[];
  maxOpenWeighted: number;
  closedOpportunities: ClosedOpportunity[];
  listRows: OpportunityListRow[];
}) {
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-control border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]">
          <Link
            href="?display=board"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[3px] px-3 text-[12.5px]",
              display === "board" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Link>
          <Link
            href="?display=table"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[3px] px-3 text-[12.5px]",
              display === "table" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
            )}
          >
            <ListIcon className="h-3.5 w-3.5" /> Table
          </Link>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setClosedOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-4 text-[13px] text-[var(--color-ink)]"
          >
            Closed <span className="text-[var(--color-muted)]">{closedOpportunities.length}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          </button>
          <Button asChild>
            <Link href="/opportunities/new">
              <Plus className="h-[14px] w-[14px]" /> New opportunity
            </Link>
          </Button>
        </div>
      </div>

      <div className="-mt-2 flex flex-wrap justify-end gap-[18px] text-[13px] text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-alert)]" /> Next action overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-pos)]" /> Next action due today or later
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-muted)] opacity-55" /> No next action
        </span>
      </div>

      {closedOpen ? (
        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          {closedOpportunities.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No closed opportunities.</p>
          ) : (
            closedOpportunities.map((o, i) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className={cn("flex min-h-[46px] items-center justify-between gap-3 px-4 py-2 text-[var(--color-ink)] no-underline", i > 0 && "border-t border-[var(--color-line)]")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{o.name}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">{o.organizationName}</span>
                </span>
                <span className="text-sm text-[var(--color-ink2)]">{formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)}</span>
                <StatusBadge value={o.stage} />
              </Link>
            ))
          )}
        </div>
      ) : null}

      {display === "board" ? (
        <OpportunityBoard initialOpportunities={openOpportunities} maxOpenWeighted={maxOpenWeighted} />
      ) : (
        <OpportunitiesTable rows={listRows} />
      )}
    </div>
  );
}
