"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List as ListIcon, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkSegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeskPicker, type DeskOption } from "@/components/shell/desk-picker";
import { PracticeFilter } from "@/components/ui/practice-filter";
import type { Practice } from "@/lib/practices";
import { formatMoney, cn } from "@/lib/utils";
import { OpportunityBoard, type BoardOpportunity } from "./opportunity-board";
import { OpportunitiesTable, type OpportunityListRow } from "./opportunities-table";

export type ClosedOpportunity = {
  id: string;
  name: string;
  organizationName: string;
  stage: string;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string | null;
  mandateId: string | null;
  mandateStatus: string | null;
};

export function OpportunitiesView({
  display,
  openOpportunities,
  closedOpportunities,
  listRows,
  displayCurrency,
  ratesToGbp,
  deskOptions,
  deskValue,
  practiceFilter,
}: {
  display: "board" | "table";
  openOpportunities: BoardOpportunity[];
  closedOpportunities: ClosedOpportunity[];
  listRows: OpportunityListRow[];
  displayCurrency: string;
  ratesToGbp: Record<string, number>;
  deskOptions: DeskOption[];
  deskValue: string;
  practiceFilter: Practice | undefined;
}) {
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div data-toolbar className="flex flex-wrap items-center justify-between gap-3">
        <LinkSegmentedToggle
          name="Board or table"
          value={display}
          options={[
            { value: "board", label: "Board", icon: LayoutGrid, href: "?display=board" },
            { value: "table", label: "Table", icon: ListIcon, href: "?display=table" },
          ]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setClosedOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-[14px] text-[13px] text-[var(--color-ink)]"
          >
            Closed <span className="text-[var(--color-muted)]">{closedOpportunities.length}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          </button>
          <DeskPicker options={deskOptions} initialValue={deskValue} />
          <PracticeFilter value={practiceFilter} />
          <Button asChild>
            <Link href="/opportunities/new">
              <Plus className="h-[14px] w-[14px]" /> New opportunity
            </Link>
          </Button>
        </div>
      </div>


      {closedOpen ? (
        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          {closedOpportunities.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No closed opportunities.</p>
          ) : (
            closedOpportunities.map((o, i) => (
              <Link
                key={o.id}
                href={o.mandateId ? `/mandates/${o.mandateId}` : `/opportunities/${o.id}`}
                className={cn("flex min-h-[46px] items-center justify-between gap-3 px-4 py-2 text-[var(--color-ink)] no-underline", i > 0 && "border-t border-[var(--color-line)]")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{o.name}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">{o.organizationName}</span>
                </span>
                <span className="text-sm text-[var(--color-ink2)]">{formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)}</span>
                {o.mandateStatus ? <StatusBadge value={o.mandateStatus} /> : <StatusBadge value={o.stage} />}
              </Link>
            ))
          )}
        </div>
      ) : null}

      {display === "board" ? (
        <OpportunityBoard initialOpportunities={openOpportunities} displayCurrency={displayCurrency} ratesToGbp={ratesToGbp} />
      ) : (
        <OpportunitiesTable rows={listRows} />
      )}
    </div>
  );
}
