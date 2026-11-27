import { cookies } from "next/headers";
import { Sidebar, type NavCounts } from "@/components/shell/sidebar";
import { WhatsNextProvider } from "@/components/shell/whats-next-provider";
import { AskAtlasProvider } from "@/components/shell/ask-atlas/ask-atlas-provider";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-cookie";

async function getNavCounts(workspaceId: string, userId: string): Promise<NavCounts> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

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
  const counts = await getNavCounts(user.workspaceId, user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar
        user={{ firstName: user.firstName, lastName: user.lastName, role: user.role }}
        counts={counts}
        defaultCollapsed={defaultCollapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Round 2 section 1: no separate top header bar — each page carries
            the desk picker/search/notifications/Quick create cluster in its
            own header row instead (see PageHeader's `user` prop). */}
        <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 pb-10 pt-8">
          <WhatsNextProvider>
            <AskAtlasProvider>{children}</AskAtlasProvider>
          </WhatsNextProvider>
        </main>
      </div>
    </div>
  );
}
