import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const PURGE_AFTER_DAYS = 30;

const PURGE_MODELS = [
  { type: "ORGANIZATION", model: prisma.organization, entityType: "Organization" },
  { type: "PERSON", model: prisma.person, entityType: "Person" },
  { type: "MANDATE", model: prisma.mandate, entityType: "Mandate" },
  { type: "OPPORTUNITY", model: prisma.opportunity, entityType: "Opportunity" },
] as const;

/**
 * Section 9.3 — "You can restore it until <date>. After that it is removed for good."
 * Hard-deletes anything archived more than 30 days ago. Relies on the schema's own
 * FK cascade/restrict rules: genuinely-owned child rows (status history, document
 * links, etc.) cascade automatically; a record still referenced elsewhere (a person
 * still a candidate on a live search, an organisation still hiring) is left alone —
 * the delete is skipped and retried on the next run, never forced.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const results: Record<string, { purged: number; skipped: number }> = {};

  for (const { type, model, entityType } of PURGE_MODELS) {
    const candidates = await (model as any).findMany({
      where: { archivedAt: { lt: cutoff } },
      select: { id: true, workspaceId: true },
    });

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

  return NextResponse.json({ cutoff: cutoff.toISOString(), results });
}
