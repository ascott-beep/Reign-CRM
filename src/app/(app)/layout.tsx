import { cookies } from "next/headers";
import { Sidebar, type NavCounts } from "@/components/shell/sidebar";
import { NotificationBell } from "@/components/shell/notification-bell";
import { WhatsNextProvider } from "@/components/shell/whats-next-provider";
import { AskAtlasProvider } from "@/components/shell/ask-atlas/ask-atlas-provider";
import { ToastProvider } from "@/components/shell/toast-provider";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSuggestedAskQuestions } from "@/lib/ask-ai-suggestions";
import { endOfTodayInLondon } from "@/lib/datetime";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-cookie";

async function getNavCounts(workspaceId: string, userId: string): Promise<NavCounts> {
  const endOfToday = endOfTodayInLondon();

  const [tasks, mandates, opportunities, intelligence] = await Promise.all([
    prisma.task.count({
      where: { workspaceId, assignedUserId: userId, status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { lte: endOfToday } },
    }),
    prisma.mandate.count({ where: { workspaceId, status: { notIn: ["FILLED", "CANCELLED", "ON_HOLD"] } } }),
    prisma.opportunity.count({ where: { workspaceId, stage: { notIn: ["WON", "LOST", "ON_HOLD"] } } }),
    // Round 2 section 5 added reviewState — this now counts signals actually waiting for review, not just "recent".
    prisma.intelligenceItem.count({ where: { workspaceId, reviewState: "PENDING_REVIEW" } }),
  ]);

  return { tasks, mandates, opportunities, intelligence };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  const [counts, unreadNotifications, suggestedQuestions] = await Promise.all([
    getNavCounts(user.workspaceId, user.id),
    getUnreadNotificationCount(user.id),
    getSuggestedAskQuestions(user),
  ]);

  return (
    <AskAtlasProvider suggestedQuestions={suggestedQuestions}>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
          <Sidebar
            user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
            counts={counts}
            defaultCollapsed={defaultCollapsed}
            notificationBell={<NotificationBell initialUnreadCount={unreadNotifications} />}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Round 3 item 7: no separate top header bar — search/ask, + New and
                notifications live in the sidebar now (its "Ask AI or search" bar
                needs AskAtlasProvider too, so that now wraps the whole layout,
                not just the page content). A page's own PageHeader only ever
                carries that page's own actions, plus the desk picker on the
                five pages it filters (see GlobalHeaderControls). */}
            <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 pb-10 pt-8">
              <WhatsNextProvider>{children}</WhatsNextProvider>
            </main>
          </div>
        </div>
      </ToastProvider>
    </AskAtlasProvider>
  );
}
