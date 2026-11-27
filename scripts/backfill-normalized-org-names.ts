/**
 * One-off data refresh after widening normalizeName() to also strip
 * "Grp"/"Group" (Phase 6) — recomputes the stored Organization.normalizedName
 * column so existing rows (seeded or imported before this change) are
 * flagged as duplicates correctly. Safe to re-run; no schema change.
 *
 * Run with: npx tsx scripts/backfill-normalized-org-names.ts
 */
import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../src/lib/normalize";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, normalizedName: true } });
  let changed = 0;
  for (const org of orgs) {
    const next = normalizeName(org.name);
    if (next !== org.normalizedName) {
      await prisma.organization.update({ where: { id: org.id }, data: { normalizedName: next } });
      changed++;
    }
  }
  console.log(`Recomputed normalizedName for ${changed} of ${orgs.length} organisations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
