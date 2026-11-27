import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Shown when a list page is reached via a Reports "Fix" link, so the filtered view is self-explanatory. */
export function FixBanner({ label, clearHref }: { label: string; clearHref: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] bg-[var(--color-status-warning-bg)] px-4 py-2.5 text-[13px] text-[var(--color-status-warning-ink)]">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Showing: {label}
      </span>
      <Link href={clearHref} className="shrink-0 underline">
        Clear filter
      </Link>
    </div>
  );
}
