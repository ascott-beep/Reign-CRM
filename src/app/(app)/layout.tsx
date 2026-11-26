import { cookies } from "next/headers";
import { Sidebar, type NavCounts } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-cookie";

async function getNavCounts(workspaceId: string, userId: string): Promise<NavCounts> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [tasks, mandates, opportunities, intelligence] = await Promise.all([
    prisma.task.count({
      where: { workspaceId, assignedUserId: userId, status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { lte: endOfToday } },
    }),
    prisma.mandate.count({ where: { workspaceId, status: { notIn: ["FILLED", "CANCELLED", "ON_HOLD"] } } }),
    prisma.opportunity.count({ where: { workspaceId, stage: { notIn: ["WON", "LOST", "ON_HOLD"] } } }),
    // No reviewState field yet (SPEC.md section 6 lists it as a field to add later) —
    // approximated here as "received in the last 7 days" until that lands.
    prisma.intelligenceItem.count({ where: { workspaceId, dateReceived: { gte: sevenDaysAgo } } }),
  ]);

  return { tasks, mandates, opportunities, intelligence };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  const counts = await getNavCounts(user.workspaceId, user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar
        user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
        counts={counts}
        defaultCollapsed={defaultCollapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 pb-10 pt-8">{children}</main>
      </div>
    </div>
  );
}
