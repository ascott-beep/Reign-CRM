import { AlertTriangle, Inbox, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function Frame({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
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
      <Icon className="h-8 w-8 text-[var(--color-ink-subtle)]" />
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description ? <p className="max-w-sm text-sm text-[var(--color-ink-subtle)]">{description}</p> : null}
      {action}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return <Frame icon={Inbox} title={title} description={description} action={action} className={className} />;
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

export function PermissionDeniedState({
  description = "You don't have access to view this record.",
}: {
  description?: string;
}) {
  return <Frame icon={Lock} title="Access restricted" description={description} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-ink-subtle)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
