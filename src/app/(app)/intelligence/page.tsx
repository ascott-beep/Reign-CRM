import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime } from "@/lib/datetime";
import { getWatchlistSummary } from "@/lib/intelligence-sweep";
import { SignalCardList, DismissedList } from "./review-queue";
import { LogSignalButton } from "./log-signal-button";
import { ResearchCompanyCard, WatchingCard } from "./research-company-card";
import { subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intelligence" };

const queueSelect = {
  id: true,
  title: true,
  type: true,
  confidence: true,
  dateReceived: true,
  dismissReason: true,
  dismissedAt: true,
  sourceUrl: true,
  details: true,
  organization: { select: { id: true, name: true } },
  sourcePerson: { select: { id: true, firstName: true, lastName: true } },
  sources: { select: { id: true, url: true, title: true } },
} satisfies Prisma.IntelligenceItemSelect;

export default async function IntelligencePage() {
  const user = await requireUser();

  const [pendingReview, accepted, dismissedRecently, organizations, workspace, watchlist] = await Promise.all([
    prisma.intelligenceItem.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, reviewState: "PENDING_REVIEW" },
      orderBy: { dateReceived: "desc" },
      select: queueSelect,
    }),
    prisma.intelligenceItem.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, reviewState: "ACCEPTED" },
      orderBy: { dateReceived: "desc" },
      select: queueSelect,
      take: 50,
    }),
    prisma.intelligenceItem.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, reviewState: "DISMISSED", dismissedAt: { gte: subDays(new Date(), 30) } },
      orderBy: { dismissedAt: "desc" },
      select: queueSelect,
    }),
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { intelligenceSweepEnabled: true, intelligenceSweepHourUtc: true } }),
    getWatchlistSummary(user.workspaceId),
  ]);

  const sweepTimeLabel = workspace.intelligenceSweepEnabled
    ? formatTime(new Date(Date.UTC(2000, 0, 1, workspace.intelligenceSweepHourUtc, 0, 0)))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Intelligence"
        description="News about your clients and their portfolios, with a suggested next step for each."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/intelligence/log">Signal log</Link>
            </Button>
            <LogSignalButton organizations={organizations} currentUserId={user.id} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="review">
          <TabsList>
            <TabsTrigger value="review">
              To review {pendingReview.length > 0 ? <span className="ml-1.5 rounded-full bg-[var(--color-navy)] px-1.5 py-0.5 text-[11px] text-[var(--color-navy-ink)]">{pendingReview.length}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          </TabsList>
          <TabsContent value="review" className="mt-4">
            <SignalCardList items={pendingReview} />
          </TabsContent>
          <TabsContent value="accepted" className="mt-4">
            <SignalCardList items={accepted} />
          </TabsContent>
          <TabsContent value="dismissed" className="mt-4">
            <DismissedList items={dismissedRecently} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4">
          <ResearchCompanyCard />
          <WatchingCard rows={watchlist} sweepTimeLabel={sweepTimeLabel} />
        </div>
      </div>
    </div>
  );
}
