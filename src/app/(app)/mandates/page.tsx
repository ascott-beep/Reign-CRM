import Link from "next/link";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { mandateViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { nextActionStatus } from "@/lib/next-action-status";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { MandateBoard, type BoardMandate } from "./mandate-board";
import type { Prisma } from "@prisma/client";

export default async function MandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const display = sp.display === "table" ? "table" : "board";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "MANDATE" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.MandateWhereInput = { workspaceId: user.workspaceId, archivedAt: null, ...mandateVisibilityWhere(user) };
  if (activeView) Object.assign(where, mandateViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const mandates = await prisma.mandate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { hiringOrganization: true, owner: true, candidateProcesses: { select: { stage: true } }, primaryNextTask: true },
  });

  const boardData: BoardMandate[] = mandates.map((m) => ({
    id: m.id,
    reference: m.reference,
    title: m.title,
    status: m.status,
    organizationName: m.hiringOrganization.name,
    ownerName: `${m.owner.firstName} ${m.owner.lastName}`,
    priority: m.priority,
    confidentiality: m.confidentiality,
    candidateCount: m.candidateProcesses.length,
    activeCandidateCount: m.candidateProcesses.filter((p) => !["PLACED", "REJECTED", "WITHDRAWN"].includes(p.stage)).length,
    nextActionStatus: nextActionStatus(m.primaryNextTask?.dueDate),
  }));

  return (
    <div>
      <PageHeader
        title="Mandates"
        description={`${mandates.length} mandate${mandates.length === 1 ? "" : "s"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <div className="flex overflow-hidden rounded-md border border-[var(--color-border-strong)]">
              <Link href="?display=board" className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs", display === "board" ? "bg-[var(--color-canvas)]" : "")}>
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </Link>
              <Link href="?display=table" className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--color-border-strong)]", display === "table" ? "bg-[var(--color-canvas)]" : "")}>
                <ListIcon className="h-3.5 w-3.5" /> Table
              </Link>
            </div>
            <Button asChild>
              <Link href="/mandates/new">
                <Plus className="h-4 w-4" /> New mandate
              </Link>
            </Button>
          </>
        }
      />

      {mandates.length === 0 ? (
        <EmptyState
          title="No mandates"
          action={
            <Button asChild size="sm" className="mt-2">
              <Link href="/mandates/new">
                <Plus className="h-4 w-4" /> New mandate
              </Link>
            </Button>
          }
        />
      ) : display === "board" ? (
        <MandateBoard
          key={mandates.map((m) => `${m.id}:${m.status}`).join(",")}
          initialMandates={boardData}
        />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandates.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <Link href={`/mandates/${m.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                      {m.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{m.title}</TableCell>
                  <TableCell>{m.hiringOrganization.name}</TableCell>
                  <TableCell>
                    <StatusBadge value={m.status} />
                  </TableCell>
                  <TableCell>{label(m.priority)}</TableCell>
                  <TableCell>{m.candidateProcesses.length} candidate{m.candidateProcesses.length === 1 ? "" : "s"}</TableCell>
                  <TableCell>{m.owner.firstName} {m.owner.lastName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <NextActionDot status={nextActionStatus(m.primaryNextTask?.dueDate)} />
                      {m.primaryNextTask ? m.primaryNextTask.title : <span className="text-[var(--color-ink-subtle)]">No next action</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
