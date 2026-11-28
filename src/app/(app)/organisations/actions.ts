"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canMergeRecords, PermissionError } from "@/lib/permissions";
import { organizationFormSchema, organizationRelationshipSchema } from "@/lib/validation/organization";
import { normalizeName, normalizeWebsiteDomain } from "@/lib/normalize";
import { findOrganizationDuplicates } from "@/lib/duplicates";
import { writeAuditLog, diffFields } from "@/lib/audit";
import { researchOrganization } from "@/lib/intelligence-sweep";
import { researchNewOrganization, type OrganizationResearchResult } from "@/lib/organization-research";
import { areaNameForPractice, PRACTICES, type Practice } from "@/lib/practices";

/** Looks up the PracticeArea row ids for a workspace's Finance/Commercial/Technology & Data/Transformation rows matching the given practice keys (every workspace is seeded with all four, so this never needs to create one). */
async function practiceAreaIdsForPractices(workspaceId: string, practices: string[]): Promise<string[]> {
  const names = practices.filter((p): p is Practice => (PRACTICES as readonly string[]).includes(p)).map(areaNameForPractice);
  if (names.length === 0) return [];
  const rows = await prisma.practiceArea.findMany({ where: { workspaceId, name: { in: names } }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Replaces an organisation's "practices they hire" with exactly the given set. */
async function syncHiringPracticeAreas(organizationId: string, workspaceId: string, practiceKeys: string[] | undefined) {
  if (!practiceKeys) return;
  const practiceAreaIds = await practiceAreaIdsForPractices(workspaceId, practiceKeys);
  await prisma.organizationPracticeArea.deleteMany({ where: { organizationId } });
  if (practiceAreaIds.length > 0) {
    await prisma.organizationPracticeArea.createMany({ data: practiceAreaIds.map((practiceAreaId) => ({ organizationId, practiceAreaId })) });
  }
}

/** Replaces a portfolio company's ownership (owned-by + co-investor) OrganizationRelationship rows with exactly what the form submitted. */
async function syncOwnership(
  organizationId: string,
  workspaceId: string,
  createdById: string,
  owned: {
    ownedByOrganizationId?: string;
    fundVehicleName?: string;
    dealType?: string;
    ownershipLevel?: string;
    investedDate?: Date;
    coInvestorOrganizationIds?: string[];
  },
) {
  await prisma.organizationRelationship.deleteMany({
    where: { targetOrganizationId: organizationId, type: { in: ["CURRENT_INVESTOR_IN", "CO_INVESTOR_WITH"] } },
  });
  if (owned.ownedByOrganizationId) {
    await prisma.organizationRelationship.create({
      data: {
        workspaceId,
        sourceOrganizationId: owned.ownedByOrganizationId,
        targetOrganizationId: organizationId,
        type: "CURRENT_INVESTOR_IN",
        investmentStatus: "CURRENT",
        investmentDate: owned.investedDate ?? null,
        fundVehicleName: owned.fundVehicleName ?? null,
        dealType: (owned.dealType as never) ?? null,
        ownershipLevel: (owned.ownershipLevel as never) ?? null,
        isLeadInvestor: true,
        createdById,
      },
    });
  }
  for (const coInvestorId of owned.coInvestorOrganizationIds ?? []) {
    await prisma.organizationRelationship.create({
      data: {
        workspaceId,
        sourceOrganizationId: coInvestorId,
        targetOrganizationId: organizationId,
        type: "CO_INVESTOR_WITH",
        investmentStatus: "CURRENT",
        investmentDate: owned.investedDate ?? null,
        createdById,
      },
    });
  }
}

export type OrgFormState = {
  errors?: Record<string, string[]>;
  duplicates?: Awaited<ReturnType<typeof findOrganizationDuplicates>>;
  formValues?: Record<string, unknown>;
};

function readForm(formData: FormData) {
  // Object.fromEntries would silently keep only the last value for a
  // repeated name (several hidden inputs for one array field, e.g.
  // sectorIds) -- getAll per key keeps every one of them.
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  return raw;
}

/** Round 4 screens 26/27: the Organisation combobox's "Add X as a new organisation" row -- creates a bare record (name only) so the picker always ends on a real id. */
export async function quickCreateOrganizationAction(name: string): Promise<{ id: string; name: string }> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");

  const org = await prisma.organization.create({
    data: {
      workspaceId: user.workspaceId,
      name: trimmed,
      normalizedName: normalizeName(trimmed),
      type: "OTHER_COMPANY",
      status: "RESEARCH",
      createdById: user.id,
    },
  });

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Organization", entityId: org.id, action: "CREATE", changedFields: { name: org.name } });
  revalidatePath("/organisations");
  return { id: org.id, name: org.name };
}

/** Round 4 screen 27 "New organisation, filled by AI" -- the Research button on the create form, before the record exists. */
export async function researchNewOrganizationAction(name: string): Promise<OrganizationResearchResult> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();
  if (!name.trim()) throw new Error("Type a name first.");
  return researchNewOrganization(name.trim());
}

export async function createOrganizationAction(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = readForm(formData);
  const parsed = organizationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  }
  const data = parsed.data;

  if (!data.confirmNotDuplicate) {
    const duplicates = await findOrganizationDuplicates(user.workspaceId, {
      name: data.name,
      website: data.website,
      linkedinUrl: data.linkedinUrl,
    });
    if (duplicates.length > 0) {
      return { duplicates, formValues: raw };
    }
  }

  const org = await prisma.organization.create({
    data: {
      workspaceId: user.workspaceId,
      name: data.name,
      normalizedName: normalizeName(data.name),
      type: data.type,
      status: data.status,
      website: data.website ?? null,
      normalizedWebsiteDomain: normalizeWebsiteDomain(data.website),
      linkedinUrl: data.linkedinUrl ?? null,
      hqCity: data.hqCity ?? null,
      hqRegion: data.hqRegion ?? null,
      hqCountryCode: data.hqCountryCode ?? null,
      employeeCountMin: data.employeeCountMin ?? null,
      employeeCountMax: data.employeeCountMax ?? null,
      description: data.description ?? null,
      internalSummary: data.internalSummary ?? null,
      accountPriority: data.accountPriority,
      relationshipOwnerId: data.relationshipOwnerId ?? null,
      source: data.source ?? null,
      sourceUrl: data.sourceUrl ?? null,
      ownershipTypeId: data.ownershipTypeId ?? null,
      fundVintageOrCurrentFundName: data.fundVintageOrCurrentFundName ?? null,
      aumAmount: data.aumAmount ?? null,
      aumCurrency: data.aumCurrency ?? null,
      portfolioClassification: data.portfolioClassification ?? null,
      businessModelSummary: data.businessModelSummary ?? null,
      investmentThesisSummary: data.investmentThesisSummary ?? null,
      currentFundName: data.currentFundName ?? null,
      fundSizeAmount: data.fundSizeAmount ?? null,
      fundSizeCurrency: data.fundSizeCurrency ?? null,
      fundVintageYear: data.fundVintageYear ?? null,
      typicalMinEquityChequeAmount: data.typicalMinEquityChequeAmount ?? null,
      typicalMinEquityChequeCurrency: data.typicalMinEquityChequeCurrency ?? null,
      typicalMaxEquityChequeAmount: data.typicalMaxEquityChequeAmount ?? null,
      typicalMaxEquityChequeCurrency: data.typicalMaxEquityChequeCurrency ?? null,
      investmentRegions: (data.investmentRegions as never) ?? [],
      countriesOfOperation: data.countriesOfOperation ?? [],
      ebitdaAmount: data.ebitdaAmount ?? null,
      ebitdaCurrency: data.ebitdaCurrency ?? null,
      revenueAmount: data.revenueAmount ?? null,
      revenueCurrency: data.revenueCurrency ?? null,
      likelyExitWindow: data.likelyExitWindow ?? null,
      createdById: user.id,
      sectors:
        data.sectorIds && data.sectorIds.length > 0
          ? { create: data.sectorIds.map((sectorId, i) => ({ sectorId, isPrimary: i === 0 })) }
          : data.sectorId
            ? { create: [{ sectorId: data.sectorId, isPrimary: true }] }
            : undefined,
      investorStrategies:
        data.investorStrategyIds && data.investorStrategyIds.length > 0
          ? { create: data.investorStrategyIds.map((strategyId) => ({ strategyId })) }
          : undefined,
    },
  });

  await syncHiringPracticeAreas(org.id, user.workspaceId, data.hiringPracticeAreaIds);
  if (data.type === "PORTFOLIO_COMPANY") {
    await syncOwnership(org.id, user.workspaceId, user.id, {
      ownedByOrganizationId: data.ownedByOrganizationId,
      fundVehicleName: data.fundVehicleName,
      dealType: data.dealType,
      ownershipLevel: data.ownershipLevel,
      investedDate: data.investedDate,
      coInvestorOrganizationIds: data.coInvestorOrganizationIds,
    });
  }

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: org.id,
    action: "CREATE",
    changedFields: { name: org.name, type: org.type },
  });

  revalidatePath("/organisations");
  if (formData.get("intent") === "another") {
    redirect(`/organisations/new?created=${encodeURIComponent("Organisation added")}`);
  }
  redirect(`/organisations/${org.id}?created=${encodeURIComponent("Organisation added")}`);
}

export async function updateOrganizationAction(
  orgId: string,
  _prev: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = readForm(formData);
  const parsed = organizationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: raw };
  }
  const data = parsed.data;

  const before = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  if (!data.confirmNotDuplicate && normalizeName(data.name) !== before.normalizedName) {
    const duplicates = await findOrganizationDuplicates(
      user.workspaceId,
      { name: data.name, website: data.website, linkedinUrl: data.linkedinUrl },
      orgId,
    );
    if (duplicates.length > 0) return { duplicates, formValues: raw };
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.name,
      normalizedName: normalizeName(data.name),
      type: data.type,
      status: data.status,
      website: data.website ?? null,
      normalizedWebsiteDomain: normalizeWebsiteDomain(data.website),
      linkedinUrl: data.linkedinUrl ?? null,
      hqCity: data.hqCity ?? null,
      hqRegion: data.hqRegion ?? null,
      hqCountryCode: data.hqCountryCode ?? null,
      employeeCountMin: data.employeeCountMin ?? null,
      employeeCountMax: data.employeeCountMax ?? null,
      description: data.description ?? null,
      internalSummary: data.internalSummary ?? null,
      accountPriority: data.accountPriority,
      relationshipOwnerId: data.relationshipOwnerId ?? null,
      source: data.source ?? null,
      sourceUrl: data.sourceUrl ?? null,
      ownershipTypeId: data.ownershipTypeId ?? null,
      fundVintageOrCurrentFundName: data.fundVintageOrCurrentFundName ?? null,
      aumAmount: data.aumAmount ?? null,
      aumCurrency: data.aumCurrency ?? null,
      portfolioClassification: data.portfolioClassification ?? null,
      businessModelSummary: data.businessModelSummary ?? null,
      investmentThesisSummary: data.investmentThesisSummary ?? null,
    },
  });

  if (data.sectorIds) {
    await prisma.organizationSector.deleteMany({ where: { organizationId: orgId } });
    if (data.sectorIds.length > 0) {
      await prisma.organizationSector.createMany({
        data: data.sectorIds.map((sectorId, i) => ({ organizationId: orgId, sectorId, isPrimary: i === 0 })),
      });
    }
  }

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: orgId,
    action: "UPDATE",
    changedFields: diffFields(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
  });

  revalidatePath(`/organisations/${orgId}`);
  redirect(`/organisations/${orgId}`);
}


export async function addOrganizationRelationshipAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = organizationRelationshipSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  if (data.sourceOrganizationId === data.targetOrganizationId) {
    throw new Error("An organisation cannot have a relationship with itself.");
  }

  const existing = await prisma.organizationRelationship.findFirst({
    where: {
      sourceOrganizationId: data.sourceOrganizationId,
      targetOrganizationId: data.targetOrganizationId,
      type: data.type as any,
      archivedAt: null,
    },
  });
  if (existing) {
    throw new Error("This relationship already exists between these organisations.");
  }

  await prisma.organizationRelationship.create({
    data: {
      workspaceId: user.workspaceId,
      sourceOrganizationId: data.sourceOrganizationId,
      targetOrganizationId: data.targetOrganizationId,
      type: data.type as any,
      investmentStatus: (data.investmentStatus as any) ?? null,
      investmentDate: data.investmentDate ?? null,
      exitDate: data.exitDate ?? null,
      ownershipPercentage: data.ownershipPercentage ?? null,
      isLeadInvestor: data.isLeadInvestor ?? false,
      investmentAmount: data.investmentAmount ?? null,
      investmentCurrency: data.investmentCurrency ?? null,
      notes: data.notes ?? null,
      createdById: user.id,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "OrganizationRelationship",
    entityId: data.sourceOrganizationId,
    action: "CREATE",
    changedFields: { sourceOrganizationId: data.sourceOrganizationId, targetOrganizationId: data.targetOrganizationId, type: data.type },
  });

  revalidatePath(`/organisations/${data.sourceOrganizationId}`);
  revalidatePath(`/organisations/${data.targetOrganizationId}`);
}

/**
 * d07 "Merge duplicate organisations" — survivorFieldOverrides lets the user
 * pick the duplicate's value for name/website/hqCity instead of the
 * survivor's (the only fields the dialog offers a per-field choice for).
 * Every other link moves across; composite-unique join rows are dropped
 * where the survivor already has the same link, and relationship rows that
 * would end up pointing an organisation at itself are dropped outright.
 */
export async function mergeOrganizationAction(
  survivorId: string,
  duplicateId: string,
  survivorFieldOverrides?: { name?: string; website?: string | null; hqCity?: string | null },
) {
  const user = await requireUser();
  if (!canMergeRecords(user.role)) throw new PermissionError("Only administrators can merge records.");
  if (survivorId === duplicateId) throw new Error("Cannot merge an organisation with itself.");

  await prisma.$transaction(async (tx) => {
    if (survivorFieldOverrides) {
      await tx.organization.update({
        where: { id: survivorId },
        data: {
          name: survivorFieldOverrides.name,
          website: survivorFieldOverrides.website,
          hqCity: survivorFieldOverrides.hqCity,
          normalizedName: survivorFieldOverrides.name ? normalizeName(survivorFieldOverrides.name) : undefined,
          normalizedWebsiteDomain: survivorFieldOverrides.website !== undefined ? normalizeWebsiteDomain(survivorFieldOverrides.website) : undefined,
        },
      });
    }

    // Straightforward reassignment — no uniqueness constraint to collide with.
    await tx.employmentHistory.updateMany({ where: { organizationId: duplicateId }, data: { organizationId: survivorId } });
    await tx.employmentHistoryInvestor.updateMany({ where: { organizationId: duplicateId }, data: { organizationId: survivorId } });
    await tx.opportunity.updateMany({ where: { hiringOrganizationId: duplicateId }, data: { hiringOrganizationId: survivorId } });
    await tx.mandate.updateMany({ where: { hiringOrganizationId: duplicateId }, data: { hiringOrganizationId: survivorId } });
    await tx.placement.updateMany({ where: { hiringOrganizationId: duplicateId }, data: { hiringOrganizationId: survivorId } });
    await tx.intelligenceItem.updateMany({ where: { organizationId: duplicateId }, data: { organizationId: survivorId } });
    await tx.offLimitsRestriction.updateMany({ where: { organizationId: duplicateId }, data: { organizationId: survivorId } });

    // Composite-unique join tables: reassign only where the survivor doesn't
    // already have the same link, then drop the now-redundant duplicate row.
    for (const [model, key] of [
      [tx.organizationInvestorStrategy, "strategyId"],
      [tx.organizationSector, "sectorId"],
      [tx.opportunityFund, "opportunityId"],
      [tx.mandateFund, "mandateId"],
      [tx.intelligenceItemFund, "intelligenceItemId"],
      [tx.activityOrganization, "activityId"],
      [tx.taskOrganization, "taskId"],
      [tx.documentOrganization, "documentId"],
      [tx.tagOnOrganization, "tagId"],
    ] as const) {
      const rows = await (model as any).findMany({ where: { organizationId: duplicateId } });
      for (const row of rows) {
        const existing = await (model as any).findFirst({ where: { organizationId: survivorId, [key]: row[key] } });
        if (existing) {
          await (model as any).delete({ where: { id: row.id } });
        } else {
          await (model as any).update({ where: { id: row.id }, data: { organizationId: survivorId } });
        }
      }
    }

    // Person-organisation links aren't uniquely constrained in the schema,
    // but the same person can still end up linked to the survivor twice
    // (once already, once from the duplicate) — dedupe on personId.
    const personLinks = await tx.personOrganizationAssociation.findMany({ where: { organizationId: duplicateId } });
    for (const link of personLinks) {
      const existing = await tx.personOrganizationAssociation.findFirst({ where: { organizationId: survivorId, personId: link.personId } });
      if (existing) {
        await tx.personOrganizationAssociation.delete({ where: { id: link.id } });
      } else {
        await tx.personOrganizationAssociation.update({ where: { id: link.id }, data: { organizationId: survivorId } });
      }
    }

    // Relationship rows reference an organisation on both sides — reassign
    // each side independently, drop rows that would now point an
    // organisation at itself, and drop exact duplicates of a relationship
    // the survivor already has.
    for (const side of ["sourceOrganizationId", "targetOrganizationId"] as const) {
      const other = side === "sourceOrganizationId" ? "targetOrganizationId" : "sourceOrganizationId";
      const rows = await tx.organizationRelationship.findMany({ where: { [side]: duplicateId } });
      for (const row of rows) {
        if ((row as any)[other] === survivorId) {
          await tx.organizationRelationship.delete({ where: { id: row.id } });
          continue;
        }
        const existing = await tx.organizationRelationship.findFirst({
          where: { [side]: survivorId, [other]: (row as any)[other], type: row.type },
        });
        if (existing) {
          await tx.organizationRelationship.delete({ where: { id: row.id } });
        } else {
          await tx.organizationRelationship.update({ where: { id: row.id }, data: { [side]: survivorId } });
        }
      }
    }

    await tx.organization.update({ where: { id: duplicateId }, data: { archivedAt: new Date() } });

    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Organization", entityId: survivorId, action: "UPDATE", changedFields: { mergedFrom: duplicateId } },
    });
    await tx.auditLog.create({
      data: { workspaceId: user.workspaceId, actorId: user.id, entityType: "Organization", entityId: duplicateId, action: "ARCHIVE", changedFields: { mergedInto: survivorId } },
    });
  });

  revalidatePath(`/organisations/${survivorId}`);
  revalidatePath("/organisations");
  redirect(`/organisations/${survivorId}`);
}

/** Round 2 section 5 "Research now" — runs the agent for this one company immediately. */
export async function researchOrganizationNowAction(organizationId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const result = await researchOrganization(user.workspaceId, organizationId, user.id);
  revalidatePath(`/organisations/${organizationId}`);
  revalidatePath("/intelligence");
  return result;
}

/**
 * Round 4 screen 30 (R4Intel) "Research a company" — a free-text name, not
 * necessarily an existing record. Reuses the exact match-or-create logic
 * the organisation combobox already relies on (quickCreateOrganizationAction
 * above), then runs the same research used by "Research now" on a record.
 */
export async function researchCompanyByNameAction(name: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a company name.");

  let org = await prisma.organization.findFirst({
    where: { workspaceId: user.workspaceId, normalizedName: normalizeName(trimmed) },
    select: { id: true, name: true },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        workspaceId: user.workspaceId,
        name: trimmed,
        normalizedName: normalizeName(trimmed),
        type: "OTHER_COMPANY",
        status: "RESEARCH",
        createdById: user.id,
      },
      select: { id: true, name: true },
    });
  }

  const result = await researchOrganization(user.workspaceId, org.id, user.id);
  revalidatePath(`/organisations/${org.id}`);
  revalidatePath("/intelligence");
  return result;
}

/** Round 4 screen 31 (R4IntelResearch) "Save to organisation" — stores the research summary as a Timeline note, marked "From AI research". */
export async function saveResearchSummaryAction(organizationId: string, summary: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const activity = await prisma.activity.create({
    data: {
      workspaceId: user.workspaceId,
      type: "NOTE",
      subject: "From AI research",
      summary,
      fullNotes: summary,
      createdById: user.id,
      assignedOwnerId: user.id,
      organizations: { create: [{ organizationId }] },
    },
  });

  revalidatePath(`/organisations/${organizationId}`);
  return { activityId: activity.id };
}
