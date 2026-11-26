import { prisma } from "@/lib/prisma";
import { requireUser, mandateVisibilityWhere } from "@/lib/permissions";
import { mandateViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { FixBanner } from "@/components/shell/fix-banner";
import { UndoDeleteToast } from "@/components/shell/undo-delete-toast";
import { nextActionStatus } from "@/lib/next-action-status";
import {
  LIVE_MANDATE_STATUSES,
  CLOSED_MANDATE_STATUSES,
  mandateStageBarStep,
  isCandidateHidden,
  summariseCandidateProcesses,
} from "@/lib/rules";
import { label } from "@/lib/labels";
import { MandatesView } from "./mandates-view";
import type { BoardMandate } from "./mandate-board";
import type { ClosedMandate } from "./mandates-view";
import type { MandateListRow } from "./mandates-list";
import type { Prisma } from "@prisma/client";

export default async function MandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const display = sp.display === "list" ? "list" : "board";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;

  const activeView = viewId ? await prisma.savedView.findUnique({ where: { id: viewId } }) : null;

  const where: Prisma.MandateWhereInput = { workspaceId: user.workspaceId, archivedAt: null, ...mandateVisibilityWhere(user) };
  if (activeView) Object.assign(where, mandateViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const fix = typeof sp.fix === "string" ? sp.fix : undefined;
  if (fix === "no-hiring-manager") where.hiringManagerPersonId = null;

  const mandates = await prisma.mandate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      hiringOrganization: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      candidateProcesses: { select: { stage: true } },
      primaryNextTask: { select: { title: true, dueDate: true } },
    },
  });

  const now = new Date();
  const liveMandates = mandates.filter((m) => (LIVE_MANDATE_STATUSES as readonly string[]).includes(m.status));
  const closedMandatesRaw = mandates.filter((m) => (CLOSED_MANDATE_STATUSES as string[]).includes(m.status));

  const boardData: BoardMandate[] = liveMandates.map((m) => ({
    id: m.id,
    reference: m.reference,
    title: m.title,
    status: m.status,
    organizationName: m.hiringOrganization.name,
    candidateCount: m.candidateProcesses.filter((p) => !isCandidateHidden(p.stage)).length,
    nextActionStatus: nextActionStatus(m.primaryNextTask?.dueDate),
  }));

  const closedMandates: ClosedMandate[] = closedMandatesRaw.map((m) => ({
    id: m.id,
    title: m.title,
    organizationName: m.hiringOrganization.name,
    status: m.status,
  }));

  const listRows: MandateListRow[] = mandates.map((m) => {
    const visibleStages = m.candidateProcesses.map((p) => p.stage);
    const candidateCount = visibleStages.filter((s) => !isCandidateHidden(s)).length;
    const step = mandateStageBarStep(m.status);
    const status = nextActionStatus(m.primaryNextTask?.dueDate);
    const targetDatePassed = Boolean(m.targetCompletionDate && m.targetCompletionDate < now && m.status !== "FILLED");
    return {
      id: m.id,
      title: m.title,
      organizationName: m.hiringOrganization.name,
      isCritical: m.priority === "CRITICAL",
      stageLabel: label(m.status),
      stepLabel: `Step ${step} of 7`,
      targetDatePassed,
      candidateCount,
      candidateSummary: summariseCandidateProcesses(visibleStages),
      nextStepText: m.primaryNextTask?.title ?? null,
      nextActionStatus: status,
      ownerName: `${m.owner.firstName} ${m.owner.lastName}`,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader title="Mandates" description="Executive searches you are running for clients" />
      {fix === "no-hiring-manager" ? <FixBanner label="Mandates without a hiring manager" clearHref="/mandates" /> : null}
      <MandatesView display={fix ? "list" : display} liveMandates={boardData} closedMandates={closedMandates} listRows={listRows} />
      <UndoDeleteToast type="MANDATE" />
    </div>
  );
}
