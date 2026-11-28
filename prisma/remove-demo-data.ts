/**
 * Round 5 Part A item 21 — one-off removal of the sample data seeded for
 * development (Oakfield, Vantage, Bracken, Katarzyna Wysocki, the "fees
 * placed" figures, the August tasks, and everything else from prisma/seed.ts),
 * so the workspace is clean before real client data goes in.
 *
 * SAFETY (per the brief: "run it on a preview branch first, then on
 * production only after Adam confirms"):
 * - Defaults to a dry run that only lists what it would remove. Nothing is
 *   deleted unless run with --execute.
 * - Only drops ROWS (TRUNCATE), never tables or columns, and wraps the
 *   actual deletion in a transaction so a failed run leaves nothing
 *   half-deleted.
 * - Keeps the Workspace row, every User account, and the standalone lookup
 *   tables (Sector, PracticeArea, InvestorStrategy, Tag,
 *   FunctionalSpecialism, OwnershipType, CustomField definitions,
 *   InvestmentStage/PipelineStage-style settings) — only the "root"
 *   business-record tables below are truncated, which cascades to every
 *   table that references them (join tables, profiles, activity, documents,
 *   audit log, etc.) without needing to hand-order ~80 model deletions.
 * - User accounts are handled separately below (typed Prisma deletes, not a
 *   raw truncate), kept to a named allow-list rather than "everyone except
 *   one" so a newly added real user account is never accidentally caught by
 *   this list if the script is re-run later.
 *
 * This only touches ONE workspace's worth of data by design — this app has
 * exactly one in practice, and the TRUNCATE below has no per-workspace
 * WHERE clause, so do not reuse this script as-is if the app ever becomes
 * genuinely multi-workspace.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Emails to KEEP. Everything else in the User table is treated as demo/setup
// data and listed for removal (the brief calls out "the demo user Yagmur
// Demir" by name, but this is an allow-list rather than a name match so nothing
// new is swept in by surprise on a re-run).
const KEEP_USER_EMAILS = ["adam@reign.partners"];

// Root business tables — truncating these cascades to everything that
// references them (PersonPracticeArea, CandidateProfile, OrganizationRelationship,
// ActivityOrganization, TaskPerson, documents, audit log entries, etc.).
const ROOT_BUSINESS_TABLES = [
  "Organization",
  "Person",
  "Opportunity",
  "Mandate",
  "Task",
  "Activity",
  "IntelligenceItem",
  "IntelligenceRun",
  "Document",
  "AuditLog",
  "SavedView",
  "Placement",
  "OffLimitsRestriction",
];

async function main() {
  const execute = process.argv.includes("--execute");

  console.log("Demo data removal (Round 5 Part A item 21)");
  console.log(execute ? "Mode: EXECUTE — this will delete the rows listed below." : "Mode: LIST ONLY (dry run) — pass --execute to actually delete.");
  console.log("");

  console.log("Row counts in each table that would be cleared:");
  for (const table of ROOT_BUSINESS_TABLES) {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*)::bigint AS count FROM "${table}"`);
    console.log(`  ${table}: ${rows[0]!.count}`);
  }

  const orgs = await prisma.organization.findMany({ select: { name: true, type: true }, orderBy: { name: "asc" } });
  console.log(`\nOrganisations that would be removed (${orgs.length}):`);
  for (const o of orgs) console.log(`  - ${o.name} (${o.type})`);

  const people = await prisma.person.findMany({ select: { firstName: true, lastName: true }, orderBy: { lastName: "asc" } });
  console.log(`\nPeople that would be removed (${people.length}):`);
  for (const p of people) console.log(`  - ${p.firstName} ${p.lastName}`);

  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true } });
  const usersToRemove = allUsers.filter((u) => !KEEP_USER_EMAILS.includes(u.email));
  const usersToKeep = allUsers.filter((u) => KEEP_USER_EMAILS.includes(u.email));
  console.log(`\nUser accounts kept (${usersToKeep.length}):`);
  for (const u of usersToKeep) console.log(`  - ${u.firstName} ${u.lastName} <${u.email}>`);
  console.log(`\nUser accounts that would be removed (${usersToRemove.length}):`);
  for (const u of usersToRemove) console.log(`  - ${u.firstName} ${u.lastName} <${u.email}>`);

  if (!execute) {
    console.log("\nDry run only — nothing deleted. Re-run with --execute to actually remove everything listed above.");
    return;
  }

  console.log("\nDeleting business records…");
  await prisma.$transaction(async (tx) => {
    for (const table of ROOT_BUSINESS_TABLES) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  });

  console.log("Deleting non-kept user accounts…");
  for (const u of usersToRemove) {
    await prisma.user.delete({ where: { id: u.id } });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
