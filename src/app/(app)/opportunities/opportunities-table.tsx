import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { NextActionDot } from "@/components/ui/next-action-dot";
import type { NextActionStatus } from "@/lib/next-action-status";
import { formatMoney, cn } from "@/lib/utils";

export type OpportunityListRow = {
  id: string;
  name: string;
  organizationName: string;
  stage: string;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string | null;
  weightedValue: number;
  ownerName: string;
  daysAtStage: number;
  nextStepText: string | null;
  nextActionStatus: NextActionStatus;
};

const GRID = "grid grid-cols-[minmax(0,1.6fr)_140px_120px_120px_120px_110px_minmax(0,1.3fr)] items-center gap-5";

export function OpportunitiesTable({ rows }: { rows: OpportunityListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
        No opportunities match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6">
      <div className={cn(GRID, "h-10 min-w-[980px] text-[12px] text-[var(--color-muted)]")}>
        <span>Opportunity</span>
        <span>Stage</span>
        <span>Value</span>
        <span>Likely fee</span>
        <span>Days at this stage</span>
        <span>Owner</span>
        <span>Next step</span>
      </div>
      {rows.map((r, i) => (
        <Link
          key={r.id}
          href={`/opportunities/${r.id}`}
          className={cn(GRID, "min-h-[54px] min-w-[980px] py-3 text-[var(--color-ink)] no-underline", i > 0 && "border-t border-[var(--color-line)]")}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm">{r.name}</span>
            <span className="block truncate text-xs text-[var(--color-muted)]">{r.organizationName}</span>
          </span>
          <span>
            <StatusBadge value={r.stage} />
          </span>
          <span className="text-[13.5px] text-[var(--color-ink2)]">{formatMoney(r.estimatedFeeAmount, r.estimatedFeeCurrency)}</span>
          <span className="text-[13.5px] text-[var(--color-ink2)]">{formatMoney(r.weightedValue, r.estimatedFeeCurrency ?? "GBP")}</span>
          <span className="text-[13.5px] text-[var(--color-ink2)]">
            {r.daysAtStage} day{r.daysAtStage === 1 ? "" : "s"}
          </span>
          <span className="truncate text-[13.5px] text-[var(--color-ink2)]">{r.ownerName}</span>
          <span className="flex items-center gap-2">
            <NextActionDot status={r.nextActionStatus} />
            <span className={cn("truncate text-[13.5px]", r.nextActionStatus === "overdue" || !r.nextStepText ? "text-[var(--color-warn)]" : "text-[var(--color-ink2)]")}>
              {r.nextStepText ?? "No next step set"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
