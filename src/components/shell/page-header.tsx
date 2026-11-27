import { cn } from "@/lib/utils";
import { GlobalHeaderControls } from "@/components/shell/global-header-controls";
import type { SessionUser } from "@/lib/permissions";

/**
 * Round 3 item 7: pass `user` only on the five pages the desk picker
 * actually filters (Overview, Opportunities, Mandates, Tasks, Reports) to
 * show it next to that page's own actions. Search, notifications and
 * + New live in the sidebar now, not here. Omit `user` everywhere else.
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
        <div data-toolbar className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
          {user ? <GlobalHeaderControls user={user} showDeskPicker={!hideDeskPicker} /> : null}
        </div>
      ) : null}
    </div>
  );
}
