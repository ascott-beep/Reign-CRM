import { cn } from "@/lib/utils";
import type { NextActionStatus } from "@/lib/next-action-status";

// Round 3 item 4: the standard 8px status dot everywhere — red = overdue, green = due
// today or later, grey at 55% opacity = no next action. Never the oversized version
// the Focus card used to show.
const STYLES: Record<NextActionStatus, string> = {
  overdue: "bg-[var(--color-alert)]",
  scheduled: "bg-[var(--color-pos)]",
  none: "bg-[var(--color-muted)] opacity-55",
};

const LABELS: Record<NextActionStatus, string> = {
  overdue: "Next action overdue",
  scheduled: "Next action due today or later",
  none: "No next action",
};

export function NextActionDot({ status, className }: { status: NextActionStatus; className?: string }) {
  return (
    <span
      title={LABELS[status]}
      aria-label={LABELS[status]}
      role="img"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STYLES[status], className)}
    />
  );
}
