import { cn } from "@/lib/utils";
import type { NextActionStatus } from "@/lib/next-action-status";

// SPEC.md section 3 "Status dot": 10px circle, red = overdue, green = due
// today or later, grey at 55% opacity = no next action.
const STYLES: Record<NextActionStatus, string> = {
  overdue: "bg-[var(--color-alert)]",
  today: "bg-[var(--color-pos)]",
  none: "bg-[var(--color-muted)] opacity-55",
};

const LABELS: Record<NextActionStatus, string> = {
  overdue: "Next action overdue",
  today: "Next action due today or later",
  none: "No next action",
};

export function NextActionDot({ status, className }: { status: NextActionStatus; className?: string }) {
  return (
    <span
      title={LABELS[status]}
      aria-label={LABELS[status]}
      role="img"
      className={cn("inline-block h-[10px] w-[10px] shrink-0 rounded-full", STYLES[status], className)}
    />
  );
}
