import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="m-0 text-[26px] font-light leading-tight tracking-[-0.01em] text-[var(--color-ink)]">{title}</h1>
        {description ? <div className="mt-2 text-sm text-[var(--color-ink-subtle)]">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-end gap-2">{actions}</div> : null}
    </div>
  );
}
