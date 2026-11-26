import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const PURGE_AFTER_DAYS = 30;

/**
 * DRY RUN — do not flip this to false until Adam confirms. While true, this
 * route only reports what it would purge; it never deletes or writes
 * anything. Flip it only once he's reviewed a dry-run report and says so.
 */
const DRY_RUN = true;

/**
 * Records archived before the new Delete/Restore pipeline shipped (section
 * 9.3) never got an `archivedById` — that field didn't exist yet, so old-app
 * archiving (merges, duplicate resolution, etc.) left it null. This cron must
 * never purge those; `archivedById: { not: null }` alone already excludes
 * them, but this date is kept as a second, independent guard against ever
 * purging pre-redesign data. Update it only if the actual production
 * ship date for this pipeline turns out to differ.
 */
const NEW_DELETE_FLOW_CUTOVER = new Date("2026-11-26T00:00:00Z");

const PURGE_MODELS = [
  { type: "ORGANIZATION", model: prisma.organization, entityType: "Organization" },
  { type: "PERSON", model: prisma.person, entityType: "Person" },
  { type: "MANDATE", model: prisma.mandate, entityType: "Mandate" },
  { type: "OPPORTUNITY", model: prisma.opportunity, entityType: "Opportunity" },
] as const;

/**
 * Section 9.3 — "You can restore it until <date>. After that it is removed for good."
 * Hard-deletes anything archived more than 30 days ago *through the new Delete flow*
 * (never a record the old app archived before the redesign — see
 * NEW_DELETE_FLOW_CUTOVER above). Relies on the schema's own FK cascade/restrict
 * rules: genuinely-owned child rows (status history, document links, etc.) cascade
 * automatically; a record still referenced elsewhere (a person still a candidate on
 * a live search, an organisation still hiring) is left alone — the delete is
 * skipped and retried on the next run, never forced.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  // Records archived before the cutover can't be older than it and also pass this
  // filter, since `lt: cutoff` already implies `archivedAt < cutoff`; the explicit
  // gte is just the second guard described above, kept independent on purpose.
  const where = {
    archivedAt: { lt: cutoff, gte: NEW_DELETE_FLOW_CUTOVER },
    archivedById: { not: null },
  };

  const results: Record<string, { purged: number; skipped: number; wouldPurge?: { id: string; workspaceId: string }[] }> = {};

  for (const { type, model, entityType } of PURGE_MODELS) {
    const candidates = await (model as any).findMany({
      where,
      select: { id: true, workspaceId: true },
    });

    if (DRY_RUN) {
      results[type] = { purged: 0, skipped: 0, wouldPurge: candidates };
      console.log(`[purge-archived] DRY RUN — would purge ${candidates.length} ${type} record(s):`, candidates.map((c: { id: string }) => c.id));
      continue;
    }

    let purged = 0;
    let skipped = 0;
    for (const record of candidates) {
      try {
        if (type === "MANDATE") {
          // CandidateProcess->Mandate has no cascade (a candidate can be on several
          // searches), so its rows for this mandate are removed explicitly first —
          // this in turn cascades to each process's interviews, offers, etc.
          await prisma.candidateProcess.deleteMany({ where: { mandateId: record.id } });
        }
        await (model as any).delete({ where: { id: record.id } });
        await writeAuditLog({ workspaceId: record.workspaceId, actorId: null, entityType, entityId: record.id, action: "DELETE" });
        purged += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2014")) {
          skipped += 1;
        } else {
          console.error(`[purge-archived] failed to purge ${type} ${record.id}`, error);
          skipped += 1;
        }
      }
    }
    results[type] = { purged, skipped };
  }

  return NextResponse.json({ dryRun: DRY_RUN, cutoff: cutoff.toISOString(), cutover: NEW_DELETE_FLOW_CUTOVER.toISOString(), results });
}
