import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextActionStatus } from "@/lib/next-action-status";

const STYLES: Record<NextActionStatus, string> = {
  overdue: "bg-[var(--color-status-danger-ink)] text-white",
  today: "bg-[var(--color-status-success-ink)] text-white",
  none: "bg-[var(--color-status-neutral-bg)] text-[var(--color-ink-subtle)]",
};

const LABELS: Record<NextActionStatus, string> = {
  overdue: "Next action overdue",
  today: "Next action due today",
  none: "No action due",
};

export function NextActionDot({ status, className }: { status: NextActionStatus; className?: string }) {
  return (
    <span
      title={LABELS[status]}
      aria-label={LABELS[status]}
      className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", STYLES[status], className)}
    >
      <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}
