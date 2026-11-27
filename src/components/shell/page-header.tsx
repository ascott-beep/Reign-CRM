import { cn } from "@/lib/utils";
import { GlobalHeaderControls } from "@/components/shell/global-header-controls";
import type { SessionUser } from "@/lib/permissions";

/**
 * Round 2 section 1: no separate top header bar anywhere. Pass `user` on a
 * page's own PageHeader to carry the desk picker/search/notifications/Quick
 * create cluster in that page's header row instead, vertically centred with
 * the title — as in 01-overview. Omit it on secondary pages (create/edit
 * forms, settings, single-record views) where that cluster doesn't apply.
 */
export async function PageHeader({
  title,
  description,
  actions,
  user,
  hideDeskPicker,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  user?: SessionUser;
  /** Pass true when the page's own actions already include a desk picker. */
  hideDeskPicker?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3", className)}>
      <div>
        <h1 className="m-0 text-[26px] font-light leading-tight tracking-[-0.01em] text-[var(--color-ink)]">{title}</h1>
        {description ? <div className="mt-2 text-sm text-[var(--color-ink-subtle)]">{description}</div> : null}
      </div>
      {actions || user ? (
        <div data-toolbar className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {user ? <GlobalHeaderControls user={user} showDeskPicker={!hideDeskPicker} /> : null}
        </div>
      ) : null}
    </div>
  );
}
