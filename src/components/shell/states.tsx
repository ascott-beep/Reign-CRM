import { AlertTriangle, Inbox, Lock, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

function Frame({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--color-chip)]">
        <Icon className="h-5 w-5 text-[var(--color-ink-subtle)]" />
      </span>
      <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description ? <p className="max-w-sm text-sm text-[var(--color-ink-subtle)]">{description}</p> : null}
      {action}
    </div>
  );
}

/**
 * Round 4 screen 07 (R4States). Covers the empty-board-column / empty-list
 * and the filtered-list-with-no-results patterns -- same shape, just a
 * different icon, title, sentence and action, so both reuse this instead
 * of a second component.
 */
export function EmptyState({
  icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
  className,
}: {
  icon?: IconType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return <Frame icon={icon} title={title} description={description} action={action} className={className} />;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again, or contact an administrator if the problem persists.",
}: {
  title?: string;
  description?: string;
}) {
  return <Frame icon={AlertTriangle} title={title} description={description} />;
}

/** Round 4 screen 07 -- "A section that failed to load": stays inside its own card rather than taking over the page, with a Try again button that re-runs whatever loaded it. */
export function SectionErrorState({
  title = "This section did not load",
  description = "Your data is safe. Try again, or reload the page.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-warn)]" />
        <div>
          <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{title}</p>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-subtle)]">{description}</p>
        </div>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        <RotateCw className="h-[13px] w-[13px]" />
        Try again
      </Button>
    </div>
  );
}

export function PermissionDeniedState({
  description = "You don't have access to view this record.",
}: {
  description?: string;
}) {
  return <Frame icon={Lock} title="Access restricted" description={description} />;
}

/**
 * Round 4 screen 07 -- loading content is always a skeleton (grey bars in
 * the shape of what's coming), never a spinner or "Loading…" text.
 * `rows` draws a card/list skeleton (an avatar circle + two bars per row);
 * `lines` alone (no `rows`) draws plain bars, for a pop-up's fields while
 * its data loads.
 */
export function Skeleton({ rows, lines = 3, className }: { rows?: number; lines?: number; className?: string }) {
  if (rows !== undefined) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-active)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-active)]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-active)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--color-active)]" style={{ width: i === 0 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

/** A dialog's fields while its data loads (Round 4 screen 07's fourth pattern) -- skeleton rows plus two skeleton footer buttons. */
export function DialogSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-1">
      <Skeleton lines={1} className="w-1/3" />
      <Skeleton lines={2} />
      <div className="flex justify-end gap-2 pt-2">
        <div className="h-9 w-20 animate-pulse rounded-md bg-[var(--color-active)]" />
        <div className="h-9 w-28 animate-pulse rounded-md bg-[var(--color-active)]" />
      </div>
    </div>
  );
}
