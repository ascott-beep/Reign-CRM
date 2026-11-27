import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { initials, cn } from "@/lib/utils";
import { ROLE_SHORT_LABEL } from "@/lib/labels";
import { formatDistanceToNowStrict } from "date-fns";
import { formatTime, isTodayInLondon, isYesterdayInLondon } from "@/lib/datetime";
import { InviteUserDialog } from "../settings-dialogs";
import { UserRowMenu } from "../user-row-controls";

type UserStatus = "ACTIVE" | "INVITED" | "DEACTIVATED";

function statusOf(u: { passwordHash: string | null; active: boolean }): UserStatus {
  if (!u.passwordHash) return "INVITED";
  return u.active ? "ACTIVE" : "DEACTIVATED";
}

const STATUS_CHIP: Record<UserStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-ink)]" },
  INVITED: { label: "Invited", className: "bg-[var(--color-chip-strong)] text-[var(--color-chip-strong-ink)]" },
  DEACTIVATED: { label: "Deactivated", className: "bg-[var(--color-chip)] text-[var(--color-muted)]" },
};

function lastSignedInText(u: { passwordHash: string | null; lastLoginAt: Date | null; createdAt: Date }): string {
  if (!u.passwordHash) return `Invite sent ${formatDistanceToNowStrict(u.createdAt)} ago`;
  if (!u.lastLoginAt) return "Never";
  if (isTodayInLondon(u.lastLoginAt)) return `Today, ${formatTime(u.lastLoginAt)}`;
  if (isYesterdayInLondon(u.lastLoginAt)) return "Yesterday";
  return `${formatDistanceToNowStrict(u.lastLoginAt)} ago`;
}

export default async function SettingsUsersPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const users = await prisma.user.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { firstName: "asc" } });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const invitedCount = users.filter((u) => !u.passwordHash).length;
  const summary = `${users.length} people · ${adminCount} admin${adminCount === 1 ? "" : "s"}${
    invitedCount > 0 ? ` · ${invitedCount} invite${invitedCount === 1 ? "" : "s"} waiting` : ""
  }`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-base font-medium">Users</h2>
          <div className="mt-1.5 text-[13px] text-[var(--color-muted)]">{summary}</div>
        </div>
        <InviteUserDialog />
      </div>

      <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-5 pb-1">
        <div className="grid grid-cols-[minmax(0,2fr)_140px_160px_150px_36px] items-center gap-4 py-2.5 text-[12.5px] text-[var(--color-muted)]">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last signed in</span>
          <span />
        </div>
        {users.map((u) => {
          const status = statusOf(u);
          const chip = STATUS_CHIP[status];
          return (
            <div
              key={u.id}
              className="grid min-h-[58px] grid-cols-[minmax(0,2fr)_140px_160px_150px_36px] items-center gap-4 border-t border-[var(--color-line)] text-[13.5px]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold",
                    status === "DEACTIVATED" ? "bg-[var(--color-chip)] text-[var(--color-muted)]" : "bg-[var(--color-navy)] text-[var(--color-navy-ink)]",
                  )}
                >
                  {initials(u.firstName, u.lastName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{u.firstName} {u.lastName}</span>
                  <span className="block truncate text-[12.5px] text-[var(--color-muted)]">{u.email}</span>
                </span>
              </span>
              <span className="text-[var(--color-ink2)]">{ROLE_SHORT_LABEL[u.role]}</span>
              <span>
                <span className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-[3px] px-2.5 py-[3px] text-[11.5px]", chip.className)}>
                  {chip.label}
                </span>
              </span>
              <span className="truncate text-[var(--color-ink2)]">{lastSignedInText(u)}</span>
              <UserRowMenu
                userId={u.id}
                role={u.role}
                active={u.active}
                isSelf={u.id === user.id}
                hasPassword={Boolean(u.passwordHash)}
                otherActiveUsers={users.filter((o) => o.id !== u.id && o.active && Boolean(o.passwordHash))}
              />
            </div>
          );
        })}
      </section>

      <p className="text-[13px] text-[var(--color-muted)]">
        Deactivated users can&apos;t sign in. Their records, notes and history stay, and their open work can be reassigned from the row menu.
      </p>
    </div>
  );
}
