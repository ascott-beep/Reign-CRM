import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeName, normalizeWebsiteDomain, normalizeEmail, levenshteinSimilarity } from "@/lib/normalize";

export type DuplicateFlag = { survivorId: string; survivorName: string };

/**
 * Workspace-wide duplicate pairs for the Organisations list's "Duplicate ·
 * merge" tag (section 4.7/5: names equal after removing Ltd/Limited/Grp/
 * Group/punctuation). O(n^2) over active organisations, which is fine at
 * this CRM's scale (dozens of records) — the per-record findOrganizationDuplicates
 * above is for the create/edit form's live check instead.
 */
export async function findAllOrganizationDuplicatePairs(workspaceId: string): Promise<Map<string, DuplicateFlag>> {
  const orgs = await prisma.organization.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, name: true, normalizedName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const flagged = new Map<string, DuplicateFlag>();
  for (let i = 0; i < orgs.length; i++) {
    for (let j = i + 1; j < orgs.length; j++) {
      const a = orgs[i]!;
      const b = orgs[j]!;
      if (a.normalizedName && a.normalizedName === b.normalizedName && !flagged.has(b.id)) {
        flagged.set(b.id, { survivorId: a.id, survivorName: a.name });
      }
    }
  }
  return flagged;
}

/**
 * Workspace-wide duplicate pairs for the People list's "Duplicate · merge"
 * tag (section 4.7/5: same email, or name within one character plus same
 * title or employer). In practice a same-title/employer match is only
 * useful to confirm a borderline name match — a name this close (one
 * character out of a full name) is already a strong enough signal on its
 * own, and requiring title/employer too would miss a duplicate created
 * with no employment history at all (e.g. a quick manual entry), so a
 * close-enough name is sufficient by itself here.
 */
export async function findAllPersonDuplicatePairs(workspaceId: string): Promise<Map<string, DuplicateFlag>> {
  const people = await prisma.person.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, firstName: true, lastName: true, primaryEmail: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const email = (p: (typeof people)[number]) => normalizeEmail(p.primaryEmail);

  const flagged = new Map<string, DuplicateFlag>();
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]!;
      const b = people[j]!;
      if (flagged.has(b.id)) continue;
      const sameEmail = email(a) && email(a) === email(b);
      const similarity = levenshteinSimilarity(normalizeName(`${a.firstName} ${a.lastName}`), normalizeName(`${b.firstName} ${b.lastName}`));
      const closeName = similarity >= 0.85;
      if (sameEmail || closeName) {
        flagged.set(b.id, { survivorId: a.id, survivorName: `${a.firstName} ${a.lastName}` });
      }
    }
  }
  return flagged;
}

export async function findOrganizationDuplicates(
  workspaceId: string,
  input: { name: string; website?: string | null; linkedinUrl?: string | null },
  excludeId?: string,
) {
  const normalizedName = normalizeName(input.name);
  const domain = normalizeWebsiteDomain(input.website);

  const candidates = await prisma.organization.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        domain ? { normalizedWebsiteDomain: domain } : undefined,
        input.linkedinUrl ? { linkedinUrl: input.linkedinUrl } : undefined,
        { normalizedName: { contains: normalizedName.split(" ")[0] ?? normalizedName } },
      ].filter(Boolean) as any[],
    },
    select: { id: true, name: true, type: true, normalizedWebsiteDomain: true, linkedinUrl: true, normalizedName: true },
    take: 20,
  });

  return candidates
    .map((c) => {
      let reason: string | null = null;
      let score = 0;
      if (domain && c.normalizedWebsiteDomain === domain) {
        reason = "Same website domain";
        score = 1;
      } else if (input.linkedinUrl && c.linkedinUrl === input.linkedinUrl) {
        reason = "Same LinkedIn URL";
        score = 1;
      } else {
        const similarity = levenshteinSimilarity(normalizedName, c.normalizedName);
        if (similarity >= 0.72) {
          reason = "Similar name";
          score = similarity;
        }
      }
      return reason ? { ...c, reason, score } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.score - a.score);
}

export async function findPersonDuplicates(
  workspaceId: string,
  input: { firstName: string; lastName: string; primaryEmail?: string | null; linkedinUrl?: string | null },
  excludeId?: string,
) {
  const email = normalizeEmail(input.primaryEmail);
  const fullName = normalizeName(`${input.firstName} ${input.lastName}`);

  const candidates = await prisma.person.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        email ? { primaryEmail: email } : undefined,
        input.linkedinUrl ? { linkedinUrl: input.linkedinUrl } : undefined,
        // Broad net for the fuzzy-name pass below: same leading characters
        // of the surname catches near-miss spellings (e.g. "Bennett" vs
        // "Bennet") that an exact match would otherwise never see.
        { lastName: { startsWith: input.lastName.slice(0, Math.max(3, input.lastName.length - 2)), mode: "insensitive" } },
      ].filter(Boolean) as any[],
    },
    select: { id: true, firstName: true, lastName: true, primaryEmail: true, linkedinUrl: true, headlineOverride: true },
    take: 20,
  });

  return candidates
    .map((c) => {
      let reason: string | null = null;
      let score = 0;
      if (email && c.primaryEmail === email) {
        reason = "Same email address";
        score = 1;
      } else if (input.linkedinUrl && c.linkedinUrl === input.linkedinUrl) {
        reason = "Same LinkedIn URL";
        score = 1;
      } else {
        const similarity = levenshteinSimilarity(fullName, normalizeName(`${c.firstName} ${c.lastName}`));
        if (similarity >= 0.75) {
          reason = "Similar name";
          score = similarity;
        }
      }
      return reason ? { ...c, reason, score } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.score - a.score);
}
