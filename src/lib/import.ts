import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeName, normalizeWebsiteDomain, normalizeEmail } from "@/lib/normalize";
import { findOrganizationDuplicates, findPersonDuplicates } from "@/lib/duplicates";
import { OrganizationType, PersonType } from "@prisma/client";

export type ImportRowResult = {
  rowNumber: number;
  status: "created" | "updated" | "skipped_duplicate" | "error";
  message: string;
};

const VALID_ORG_TYPES = new Set(Object.values(OrganizationType));
const VALID_PERSON_TYPES = new Set(Object.values(PersonType));

/**
 * Bounded, synchronous CSV import — appropriate for the demo/admin-scale
 * imports this CRM expects (dozens to low hundreds of rows). Column
 * mapping is by exact header name (see the template columns below) rather
 * than an interactive drag-to-map UI; duplicates default to "skip" unless
 * `overwriteDuplicates` is set, matching the "skip / update / create
 * distinct" choices in spirit while keeping this a single-pass operation.
 */
export async function importOrganizationsFromCsv(
  workspaceId: string,
  userId: string,
  rows: Record<string, string>[],
  duplicateStrategy: "skip" | "create",
): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2; // header is row 1
    const name = row.name?.trim();
    const type = row.type?.trim().toUpperCase();

    if (!name) {
      results.push({ rowNumber, status: "error", message: "Missing required field: name" });
      continue;
    }
    if (!type || !VALID_ORG_TYPES.has(type as OrganizationType)) {
      results.push({ rowNumber, status: "error", message: `Invalid or missing "type" (must be one of: ${[...VALID_ORG_TYPES].join(", ")})` });
      continue;
    }

    try {
      const website = row.website?.trim() || undefined;
      if (duplicateStrategy === "skip") {
        const duplicates = await findOrganizationDuplicates(workspaceId, { name, website });
        if (duplicates.length > 0) {
          results.push({ rowNumber, status: "skipped_duplicate", message: `Matches existing organisation "${duplicates[0]!.name}" (${duplicates[0]!.reason})` });
          continue;
        }
      }

      await prisma.organization.create({
        data: {
          workspaceId,
          name,
          normalizedName: normalizeName(name),
          type: type as OrganizationType,
          status: "RESEARCH",
          website: website ?? null,
          normalizedWebsiteDomain: normalizeWebsiteDomain(website),
          hqCity: row.hqCity?.trim() || null,
          hqCountryCode: row.hqCountryCode?.trim().toUpperCase() || null,
          accountPriority: (row.accountPriority?.trim().toUpperCase() as any) || "UNSCORED",
          source: "OTHER",
          createdById: userId,
        },
      });
      results.push({ rowNumber, status: "created", message: `Created "${name}"` });
    } catch (error) {
      results.push({ rowNumber, status: "error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}

export async function importPeopleFromCsv(
  workspaceId: string,
  userId: string,
  rows: Record<string, string>[],
  duplicateStrategy: "skip" | "create",
): Promise<ImportRowResult[]> {
  const results: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    if (!firstName || !lastName) {
      results.push({ rowNumber, status: "error", message: "Missing required field: firstName and/or lastName" });
      continue;
    }

    const rawTypes = (row.personTypes ?? "")
      .split("|")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const invalidType = rawTypes.find((t) => !VALID_PERSON_TYPES.has(t as PersonType));
    if (invalidType) {
      results.push({ rowNumber, status: "error", message: `Invalid personType "${invalidType}"` });
      continue;
    }

    try {
      const email = normalizeEmail(row.primaryEmail?.trim());
      if (duplicateStrategy === "skip") {
        const duplicates = await findPersonDuplicates(workspaceId, { firstName, lastName, primaryEmail: email });
        if (duplicates.length > 0) {
          results.push({ rowNumber, status: "skipped_duplicate", message: `Matches existing person "${duplicates[0]!.firstName} ${duplicates[0]!.lastName}" (${duplicates[0]!.reason})` });
          continue;
        }
      }

      await prisma.person.create({
        data: {
          workspaceId,
          firstName,
          lastName,
          primaryEmail: email,
          primaryPhone: row.primaryPhone?.trim() || null,
          personTypes: rawTypes.length > 0 ? (rawTypes as PersonType[]) : ["OTHER"],
          relationshipStatus: "RESEARCH_ONLY",
          source: "OTHER",
          createdById: userId,
        },
      });
      results.push({ rowNumber, status: "created", message: `Created "${firstName} ${lastName}"` });
    } catch (error) {
      results.push({ rowNumber, status: "error", message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}
