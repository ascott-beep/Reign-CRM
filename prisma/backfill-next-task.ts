/**
 * One-time backfill for Opportunity/Mandate/CandidateProcess/IntelligenceItem
 * .primaryNextTaskId, which was added to the schema but never actually
 * written by any task action until src/lib/next-task.ts started maintaining
 * it going forward. Existing records need this run once so the "next
 * action" pipeline indicators aren't blank until someone happens to touch
 * a task on each record. Safe to re-run — it's idempotent. Self-contained
 * (doesn't import src/lib/next-task.ts) since that file is tagged
 * "server-only" for the Next.js build and isn't resolvable from a bare
 * tsx script run.
 */
import { PrismaClient, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

async function earliestOpenTaskId(where: Record<string, unknown>) {
  const task = await prisma.task.findFirst({
    where: { archivedAt: null, status: { in: OPEN_STATUSES }, ...where },
    orderBy: { dueDate: "asc" },
    select: { id: true },
  });
  return task?.id ?? null;
}

async function main() {
  const [opportunities, mandates, candidateProcesses, intelligenceItems] = await Promise.all([
    prisma.opportunity.findMany({ select: { id: true } }),
    prisma.mandate.findMany({ select: { id: true } }),
    prisma.candidateProcess.findMany({ select: { id: true } }),
    prisma.intelligenceItem.findMany({ select: { id: true } }),
  ]);

  console.log(
    `Backfilling ${opportunities.length} opportunities, ${mandates.length} mandates, ${candidateProcesses.length} candidate processes, ${intelligenceItems.length} intelligence items…`,
  );

  for (const o of opportunities) {
    const id = await earliestOpenTaskId({ opportunities: { some: { opportunityId: o.id } } });
    await prisma.opportunity.update({ where: { id: o.id }, data: { primaryNextTaskId: id } });
  }
  for (const m of mandates) {
    const id = await earliestOpenTaskId({ mandates: { some: { mandateId: m.id } } });
    await prisma.mandate.update({ where: { id: m.id }, data: { primaryNextTaskId: id } });
  }
  for (const c of candidateProcesses) {
    const id = await earliestOpenTaskId({ candidateProcesses: { some: { candidateProcessId: c.id } } });
    await prisma.candidateProcess.update({ where: { id: c.id }, data: { primaryNextTaskId: id } });
  }
  for (const i of intelligenceItems) {
    const id = await earliestOpenTaskId({ intelligenceItems: { some: { intelligenceItemId: i.id } } });
    await prisma.intelligenceItem.update({ where: { id: i.id }, data: { primaryNextTaskId: id } });
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
