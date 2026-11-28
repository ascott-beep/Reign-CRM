/**
 * One-time backfill for Round 5 Part C.
 *
 * 1. Renames the seeded PracticeArea row "Technology and Data" to
 *    "Technology & Data" (the Part B config now uses the ampersand form,
 *    matching reign.partners exactly) — a value rename only, the row's id
 *    is unchanged so nothing that links to it is affected.
 * 2. Fills the new Person.personCategory single-choice field from the
 *    existing personTypes array, so existing records aren't blank on this
 *    field until someone happens to edit them. Only touches rows where
 *    personCategory is still null, so it's safe to re-run and won't
 *    overwrite a category someone has since set deliberately.
 *
 * Self-contained (its own PrismaClient, not the app's src/lib/prisma.ts
 * singleton) so it can run as a bare tsx script, following the existing
 * prisma/backfill-next-task.ts pattern.
 */
import { PrismaClient, PersonCategory } from "@prisma/client";

const prisma = new PrismaClient();

function categoryFromTypes(types: string[]): PersonCategory {
  if (types.includes("CANDIDATE")) return "CANDIDATE";
  if (types.includes("CLIENT_CONTACT")) return "CLIENT_CONTACT";
  return "OTHER";
}

async function main() {
  const renamed = await prisma.practiceArea.updateMany({
    where: { name: "Technology and Data" },
    data: { name: "Technology & Data" },
  });
  console.log(`Renamed ${renamed.count} "Technology and Data" practice area row(s) to "Technology & Data".`);

  const people = await prisma.person.findMany({
    where: { personCategory: null },
    select: { id: true, personTypes: true },
  });
  console.log(`Backfilling personCategory for ${people.length} people…`);

  for (const p of people) {
    await prisma.person.update({
      where: { id: p.id },
      data: { personCategory: categoryFromTypes(p.personTypes) },
    });
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
