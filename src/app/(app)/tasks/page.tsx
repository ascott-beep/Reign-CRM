import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { isBeforeTodayInLondon, isTodayInLondon } from "@/lib/datetime";
import { TaskListSection } from "./task-list-section";
import { QuickAddTask } from "./quick-add";
import { LinkSegmentedToggle } from "@/components/ui/segmented-toggle";
import { SuggestedTasksPanel } from "./suggested-tasks-panel";
import { PersonFilter } from "./person-filter";
import { TasksTabs } from "./tasks-tabs";
import { computeSuggestions } from "./suggestions";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tasks" };

const TASK_INCLUDE = {
  organizations: { select: { organization: { select: { name: true } } } },
  people: { select: { person: { select: { firstName: true, lastName: true } } } },
  opportunities: { select: { opportunity: { select: { name: true } } } },
  mandates: { select: { mandate: { select: { title: true, hiringOrganization: { select: { name: true } } } } } },
  candidateProcesses: { select: { candidateProcess: { select: { candidatePerson: { select: { firstName: true, lastName: true } }, mandate: { select: { title: true } } } } } },
  intelligenceItems: { select: { intelligenceItem: { select: { title: true } } } },
} satisfies Prisma.TaskInclude;

export type TaskWithLinks = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "team" ? "team" : "mine";
  const tab = sp.tab === "upcoming" ? "upcoming" : sp.tab === "done" ? "done" : "todo";
  const personId = typeof sp.person === "string" ? sp.person : null;

  const where: Prisma.TaskWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (view === "mine") where.assignedUserId = user.id;
  else if (personId) where.assignedUserId = personId;

  const thirtyDaysAgo = new Date(new Date().getTime() - THIRTY_DAYS_MS);
  const [openTasks, doneTasks, suggestions, users] = await Promise.all([
    prisma.task.findMany({ where: { ...where, status: { in: ["TODO", "IN_PROGRESS"] } }, include: TASK_INCLUDE, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({
      where: { ...where, status: "COMPLETED", completedAt: { gte: thirtyDaysAgo } },
      include: TASK_INCLUDE,
      orderBy: { completedAt: "desc" },
    }),
    view === "mine" ? computeSuggestions(user.workspaceId) : Promise.resolve([]),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true, id: { not: user.id } }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);

  const overdue = openTasks.filter((t) => isBeforeTodayInLondon(t.dueDate));
  const dueToday = openTasks.filter((t) => isTodayInLondon(t.dueDate));
  const upcoming = openTasks.filter((t) => !isBeforeTodayInLondon(t.dueDate) && !isTodayInLondon(t.dueDate));

  const todayText = dueToday.length === 0 ? "nothing due today" : `${dueToday.length} due today`;
  const query: Record<string, string> = { view, ...(personId ? { person: personId } : {}) };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        description={`${overdue.length} overdue · ${todayText}`}
        actions={
          <>
            <LinkSegmentedToggle
              name="Mine or team"
              value={view}
              options={[
                { value: "mine", label: "Mine", href: `/tasks?${new URLSearchParams({ tab, view: "mine" }).toString()}` },
                { value: "team", label: "Team", href: `/tasks?${new URLSearchParams({ tab, view: "team", ...(personId ? { person: personId } : {}) }).toString()}` },
              ]}
            />
            <PersonFilter options={users} currentUser={user} selectedId={personId} mine={view === "mine"} query={{ tab }} />
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-[14px] w-[14px]" /> New task
              </Link>
            </Button>
          </>
        }
        user={user}
      />

      <TasksTabs active={tab} query={query} />

      {tab === "todo" ? (
        <>
          <QuickAddTask currentUserId={user.id} />

          <TaskListSection
            groups={[
              { key: "overdue", label: "Overdue", tasks: overdue, warn: true },
              { key: "today", label: "Today", tasks: dueToday },
            ]}
            emptyText="No tasks here."
          />

          <SuggestedTasksPanel suggestions={suggestions} />
        </>
      ) : null}

      {tab === "upcoming" ? (
        <TaskListSection groups={[{ key: "upcoming", label: "Upcoming", tasks: upcoming }]} emptyText="No tasks here." />
      ) : null}

      {tab === "done" ? (
        <TaskListSection groups={[{ key: "done", label: "Done", tasks: doneTasks }]} emptyText="No tasks here." />
      ) : null}
    </div>
  );
}
