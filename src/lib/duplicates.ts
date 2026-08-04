import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeName, normalizeWebsiteDomain, normalizeEmail, levenshteinSimilarity } from "@/lib/normalize";

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
        { lastName: { equals: input.lastName, mode: "insensitive" } },
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
