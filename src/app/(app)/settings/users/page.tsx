import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { initials, cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { formatTime, isTodayInLondon, isYesterdayInLondon } from "@/lib/datetime";
import { InviteUserDialog } from "../settings-dialogs";
import { UserRowMenu } from "../user-row-controls";
import { UserRoleSelect } from "./user-role-select";

type UserStatus = "ACTIVE" | "INVITED" | "DEACTIVATED";

function statusOf(u: { passwordHash: string | null; active: boolean }): UserStatus {
  if (!u.passwordHash) return "INVITED";
  return u.active ? "ACTIVE" : "DEACTIVATED";
}

const STATUS_DOT: Record<UserStatus, string> = {
  ACTIVE: "bg-[var(--color-pos)]",
  INVITED: "bg-[var(--color-warn)]",
  DEACTIVATED: "bg-[var(--color-muted)]",
};

const STATUS_TEXT: Record<UserStatus, string> = {
  ACTIVE: "text-[var(--color-ink)]",
  INVITED: "text-[var(--color-warn)]",
  DEACTIVATED: "text-[var(--color-muted)]",
};

const ROLE_FOOTNOTES = [
  "Admin: everything, including settings, deleting records and managing users.",
  "Consultant: can create and edit records, can't change workspace settings.",
  "Read only: can view everything, can't make changes.",
];

function statusText(u: { passwordHash: string | null; lastLoginAt: Date | null; createdAt: Date }, status: UserStatus): string {
  if (status === "INVITED") return `Invited ${formatDistanceToNowStrict(u.createdAt, { addSuffix: true })}`;
  if (status === "DEACTIVATED") return "Deactivated";
  return "Active";
}

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

  const invitedCount = users.filter((u) => !u.passwordHash).length;
  const summary = `${users.length} people${invitedCount > 0 ? ` · ${invitedCount} invite${invitedCount === 1 ? "" : "s"} waiting` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-medium text-[var(--color-ink)]">Users</h2>
          <div className="mt-1 text-sm text-[var(--color-ink-subtle)]">{summary}</div>
        </div>
        <InviteUserDialog />
      </div>

      <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-5 pb-1">
        <div className="grid grid-cols-[minmax(0,2fr)_150px_160px_150px_36px] items-center gap-4 py-2.5 text-[12.5px] text-[var(--color-muted)]">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last signed in</span>
          <span />
        </div>
        {users.map((u) => {
          const status = statusOf(u);
          return (
            <div
              key={u.id}
              className="grid min-h-[58px] grid-cols-[minmax(0,2fr)_150px_160px_150px_36px] items-center gap-4 border-t border-[var(--color-line)] text-[13.5px]"
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
                  <span className="block truncate font-medium text-[var(--color-ink)]">{u.firstName} {u.lastName}</span>
                  <span className="block truncate text-[12.5px] text-[var(--color-muted)]">{u.email}</span>
                </span>
              </span>
              <span>
                <UserRoleSelect userId={u.id} role={u.role} disabled={!u.active} />
              </span>
              <span className={cn("flex items-center gap-1.5", STATUS_TEXT[status])}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status])} />
                {statusText(u, status)}
              </span>
              <span className="truncate text-[var(--color-ink2)]">{lastSignedInText(u)}</span>
              <UserRowMenu
                userId={u.id}
                active={u.active}
                isSelf={u.id === user.id}
                hasPassword={Boolean(u.passwordHash)}
                otherActiveUsers={users.filter((o) => o.id !== u.id && o.active && Boolean(o.passwordHash))}
              />
            </div>
          );
        })}
      </section>

      <p className="text-[13px] text-[var(--color-muted)]">{ROLE_FOOTNOTES.join(" ")}</p>
    </div>
  );
}
