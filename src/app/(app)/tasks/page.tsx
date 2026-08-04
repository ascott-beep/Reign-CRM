import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { taskViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { format, isBefore, startOfToday } from "date-fns";
import { TaskRowActions } from "./task-row-actions";
import type { Prisma } from "@prisma/client";

const TABS = [
  { key: "mine", label: "My Tasks" },
  { key: "all", label: "All Tasks" },
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "mine";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "TASK" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.TaskWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  const today = startOfToday();
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (filter === "mine") where.assignedUserId = user.id;
  if (filter === "today") {
    where.dueDate = { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }
  if (filter === "overdue") {
    where.dueDate = { lt: today };
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }
  if (filter === "upcoming") {
    where.dueDate = { gte: today, lt: in7 };
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }
  if (filter === "completed") where.status = "COMPLETED";

  if (activeView) Object.assign(where, taskViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const tasks = await prisma.task.findMany({
    where,
    include: { assignedUser: true },
    orderBy: filter === "completed" ? { completedAt: "desc" } : { dueDate: "asc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-4 w-4" /> New task
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/tasks?filter=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              filter === t.key ? "border-[var(--color-accent)] text-[var(--color-ink)]" : "border-transparent text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks here" />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => {
                const overdue = t.status !== "COMPLETED" && t.status !== "CANCELLED" && isBefore(t.dueDate, today);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{label(t.type)}</TableCell>
                    <TableCell>{label(t.priority)}</TableCell>
                    <TableCell>
                      <StatusBadge value={t.status} />
                    </TableCell>
                    <TableCell>
                      {format(t.dueDate, "d MMM yyyy")} {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                    </TableCell>
                    <TableCell>{t.assignedUser.firstName} {t.assignedUser.lastName}</TableCell>
                    <TableCell>
                      <TaskRowActions taskId={t.id} status={t.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
