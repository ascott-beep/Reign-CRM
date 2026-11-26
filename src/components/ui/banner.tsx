import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** SPEC.md section 3 "Banner": chipStrong fill, alert icon, one sentence, primary action + "Not yet". */
export function Banner({
  message,
  action,
  onDismiss,
  className,
}: {
  message: string;
  action?: React.ReactNode;
  onDismiss?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-none flex-wrap items-center gap-3 rounded-[6px] bg-[var(--color-chip-strong)] py-3 pl-[18px] pr-3.5 text-[14px] text-[var(--color-chip-strong-ink)]",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span className="min-w-[240px] flex-1">{message}</span>
      {action}
      {onDismiss}
    </div>
  );
}
