import Link from "next/link";
import { NextActionDot } from "@/components/ui/next-action-dot";
import type { NextActionStatus } from "@/lib/next-action-status";
import { cn } from "@/lib/utils";

export type MandateListRow = {
  id: string;
  title: string;
  organizationName: string;
  isCritical: boolean;
  stageLabel: string;
  stepLabel: string;
  targetDatePassed: boolean;
  candidateCount: number;
  candidateSummary: string;
  nextStepText: string | null;
  nextActionStatus: NextActionStatus;
  ownerName: string;
};

const GRID = "grid grid-cols-[minmax(0,1.7fr)_150px_minmax(0,1.4fr)_minmax(0,1.3fr)_140px] items-center gap-5";

export function MandatesList({ rows }: { rows: MandateListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
        No mandates match this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6">
      <div className={cn(GRID, "h-10 min-w-[900px] text-[12px] text-[var(--color-muted)]")}>
        <span>Role and client</span>
        <span>Search stage</span>
        <span>Candidates</span>
        <span>What happens next</span>
        <span>Consultant</span>
      </div>
      {rows.map((r, i) => (
        <Link
          key={r.id}
          href={`/mandates/${r.id}`}
          className={cn(GRID, "min-w-[900px] min-h-[54px] py-3 text-[var(--color-ink)] no-underline", i > 0 && "border-t border-[var(--color-line)]")}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm">{r.title}</span>
              <span className="block truncate text-xs text-[var(--color-muted)]">{r.organizationName}</span>
            </span>
          </span>
          <span>
            <span className="block text-[13.5px]">{r.stageLabel}</span>
            <span className={cn("mt-0.5 block text-xs", r.targetDatePassed ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]")}>
              {r.targetDatePassed ? "Target date passed" : r.stepLabel}
            </span>
          </span>
          <span className="truncate text-[13.5px] text-[var(--color-ink2)]">
            {r.candidateCount} candidate{r.candidateCount === 1 ? "" : "s"}
            {r.candidateSummary ? ` · ${r.candidateSummary}` : ""}
          </span>
          <span className="flex items-center gap-2">
            <NextActionDot status={r.nextActionStatus} />
            <span className={cn("truncate text-[13.5px]", r.nextActionStatus === "overdue" || !r.nextStepText ? "text-[var(--color-warn)]" : "text-[var(--color-ink2)]")}>
              {r.nextStepText ?? "No next step set"}
            </span>
          </span>
          <span className="truncate text-[13.5px] text-[var(--color-ink2)]">{r.ownerName}</span>
        </Link>
      ))}
    </div>
  );
}
