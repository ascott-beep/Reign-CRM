import { GlobalSearch } from "@/components/shell/global-search";
import { QuickCreate } from "@/components/shell/quick-create";
import { TaskIndicator } from "@/components/shell/task-indicator";
import { UserMenu } from "@/components/shell/user-menu";
import type { SessionUser } from "@/lib/permissions";

export function Header({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <QuickCreate />
      <TaskIndicator user={user} />
      <UserMenu firstName={user.firstName} lastName={user.lastName} role={user.role} />
    </header>
  );
}
