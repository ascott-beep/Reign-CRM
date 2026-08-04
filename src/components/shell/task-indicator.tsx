import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

export async function TaskIndicator({ user }: { user: SessionUser }) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const count = await prisma.task.count({
    where: {
      workspaceId: user.workspaceId,
      assignedUserId: user.id,
      archivedAt: null,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { lte: endOfToday },
    },
  });

  return (
    <Link
      href="/tasks?view=overdue"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
      title={`${count} task${count === 1 ? "" : "s"} due today or overdue`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-status-danger-ink)] px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
