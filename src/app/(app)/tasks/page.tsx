import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { formatShortDate, isBeforeTodayInLondon, isTodayInLondon } from "@/lib/datetime";
import { TaskCheckbox } from "./task-checkbox";
import { QuickAddTask } from "./quick-add";
import { LinkSegmentedToggle } from "@/components/ui/segmented-toggle";
import { SuggestedTasksPanel } from "./suggested-tasks-panel";
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

type TaskWithLinks = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

function linkedRecordText(t: TaskWithLinks): string | null {
  if (t.mandates[0]) return `${t.mandates[0].mandate.hiringOrganization.name} · ${t.mandates[0].mandate.title}`;
  if (t.candidateProcesses[0]) {
    const p = t.candidateProcesses[0].candidateProcess;
    return `${p.candidatePerson.firstName} ${p.candidatePerson.lastName} · ${p.mandate.title}`;
  }
  if (t.opportunities[0]) return t.opportunities[0].opportunity.name;
  if (t.organizations[0]) return t.organizations[0].organization.name;
  if (t.people[0]) return `${t.people[0].person.firstName} ${t.people[0].person.lastName}`;
  if (t.intelligenceItems[0]) return t.intelligenceItems[0].intelligenceItem.title;
  return null;
}

function Row({ t }: { t: TaskWithLinks }) {
  const completed = t.status === "COMPLETED";
  const overdue = !completed && t.status !== "CANCELLED" && isBeforeTodayInLondon(t.dueDate);
  const linked = linkedRecordText(t);
  return (
    <div className="flex items-center gap-4 border-t border-[var(--color-line)] px-5 py-3 text-[13.5px]">
      <TaskCheckbox taskId={t.id} completed={completed} />
      <div className="min-w-0 flex-1">
        <div className={completed ? "truncate text-[var(--color-muted)] line-through" : "truncate text-[var(--color-ink)]"}>{t.title}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
          {label(t.type)}
          {linked ? ` · ${linked}` : null}
          {!linked ? <span className="text-[var(--color-warn)]"> · No linked record · add detail</span> : null}
        </div>
      </div>
      <div className={`w-32 shrink-0 text-right text-[13px] ${overdue ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]"}`}>
        {overdue ? "Overdue · " : ""}
        {formatShortDate(t.dueDate)}
      </div>
      <div className="w-20 shrink-0 text-right">
        <Badge tone={t.priority === "URGENT" ? "warning" : "neutral"}>{label(t.priority)}</Badge>
      </div>
    </div>
  );
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "team" ? "team" : "mine";

  const where: Prisma.TaskWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (view === "mine") where.assignedUserId = user.id;

  const [openTasks, completedTasks, suggestions] = await Promise.all([
    prisma.task.findMany({ where: { ...where, status: { in: ["TODO", "IN_PROGRESS"] } }, include: TASK_INCLUDE, orderBy: { dueDate: "asc" } }),
    prisma.task.findMany({ where: { ...where, status: "COMPLETED" }, include: TASK_INCLUDE, orderBy: { completedAt: "desc" }, take: 20 }),
    computeSuggestions(user.workspaceId),
  ]);

  const overdue = openTasks.filter((t) => isBeforeTodayInLondon(t.dueDate));
  const dueToday = openTasks.filter((t) => isTodayInLondon(t.dueDate));
  const upcoming = openTasks.filter((t) => !isBeforeTodayInLondon(t.dueDate) && !isTodayInLondon(t.dueDate));

  const todayText = dueToday.length === 0 ? "nothing due today" : `${dueToday.length} due today`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        description={`${overdue.length} overdue · ${todayText} · ${suggestions.length} suggested from your pipeline`}
        actions={
          <>
            <LinkSegmentedToggle
              name="Mine or team"
              value={view}
              options={[
                { value: "mine", label: "Mine", href: "/tasks?view=mine" },
                { value: "team", label: "Team", href: "/tasks?view=team" },
              ]}
            />
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-[14px] w-[14px]" /> New task
              </Link>
            </Button>
          </>
        }
        user={user}
      />

      <QuickAddTask currentUserId={user.id} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[2_1_560px] overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="flex items-baseline gap-2 px-5 pt-4 text-sm font-medium text-[var(--color-warn)]">
            <span>Overdue</span>
            <span className="text-[var(--color-muted)]">{overdue.length}</span>
          </div>
          {overdue.map((t) => (
            <Row key={t.id} t={t} />
          ))}

          <div className="flex items-baseline gap-2 border-t border-[var(--color-line)] px-5 pt-4 text-sm font-medium">
            <span>Today</span>
            <span className="text-[var(--color-muted)]">{dueToday.length}</span>
          </div>
          {dueToday.map((t) => (
            <Row key={t.id} t={t} />
          ))}

          {upcoming.length > 0 ? (
            <>
              <div className="flex items-baseline gap-2 border-t border-[var(--color-line)] px-5 pt-4 text-sm font-medium">
                <span>Upcoming</span>
                <span className="text-[var(--color-muted)]">{upcoming.length}</span>
              </div>
              {upcoming.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </>
          ) : null}

          <div className="flex items-baseline gap-2 border-t border-[var(--color-line)] px-5 pb-1 pt-4 text-sm font-medium">
            <span>Completed</span>
            <span className="text-[var(--color-muted)]">{completedTasks.length}</span>
          </div>
          {completedTasks.map((t) => (
            <Row key={t.id} t={t} />
          ))}
          {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && completedTasks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No tasks here.</p>
          ) : null}
        </div>

        <SuggestedTasksPanel suggestions={suggestions} />
      </div>
    </div>
  );
}
