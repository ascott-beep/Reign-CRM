/**
 * One-off clean-up (Round 5 Part A item 13): some records still store an em
 * dash (—) or en dash (–) in free-text fields from before the no-dash rule
 * existed (e.g. the task "Stonebridge Travel Group — VP Finance"). Replaces
 * every run of " — "/" – " (or a bare —/–) with " · " in each field listed
 * below, logs every row it changes (model, id, field, before, after), and
 * is idempotent — safe to re-run, since a clean row simply has nothing to
 * change. Run with: npx tsx prisma/backfill-clean-dashes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DASH_RE = /\s*[—–]\s*/g;

function cleanDashes(value: string): string {
  return value.replace(DASH_RE, " · ").replace(/ {2,}/g, " ").trim();
}

type FieldTarget = { model: keyof PrismaClient; fields: string[] };

const TARGETS: FieldTarget[] = [
  { model: "organization", fields: ["name", "description", "internalSummary"] },
  { model: "person", fields: ["firstName", "middleName", "lastName", "preferredName", "headlineOverride"] },
  { model: "opportunity", fields: ["name", "potentialRoleTitle", "nextStepSummary", "notes"] },
  { model: "mandate", fields: ["title", "roleSummary", "businessContext", "requiredExperience"] },
  { model: "task", fields: ["title", "description", "completionNote"] },
  { model: "activity", fields: ["subject", "summary", "fullNotes"] },
];

async function main() {
  let totalChanged = 0;

  for (const { model, fields } of TARGETS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model];
    const rows: Record<string, unknown>[] = await delegate.findMany({
      select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) },
    });

    for (const row of rows) {
      const updates: Record<string, string> = {};
      for (const field of fields) {
        const current = row[field];
        if (typeof current !== "string") continue;
        const cleaned = cleanDashes(current);
        if (cleaned !== current) updates[field] = cleaned;
      }
      if (Object.keys(updates).length === 0) continue;

      for (const [field, newValue] of Object.entries(updates)) {
        console.log(`${String(model)}.${field} [${row.id}]: ${JSON.stringify(row[field])} -> ${JSON.stringify(newValue)}`);
      }
      await delegate.update({ where: { id: row.id }, data: updates });
      totalChanged++;
    }
  }

  console.log(`\nDone. ${totalChanged} row(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
