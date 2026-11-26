"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canArchiveRecord, canRestoreArchived, canMergeRecords, PermissionError } from "@/lib/permissions";
import { organizationFormSchema, organizationRelationshipSchema } from "@/lib/validation/organization";
import { normalizeName, normalizeWebsiteDomain } from "@/lib/normalize";
import { findOrganizationDuplicates } from "@/lib/duplicates";
import { writeAuditLog, diffFields } from "@/lib/audit";

export type OrgFormState = {
  errors?: Record<string, string[]>;
  duplicates?: Awaited<ReturnType<typeof findOrganizationDuplicates>>;
  formValues?: Record<string, unknown>;
};

function readForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return raw;
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
      createdById: user.id,
      sectors: data.sectorId ? { create: [{ sectorId: data.sectorId, isPrimary: true }] } : undefined,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: org.id,
    action: "CREATE",
    changedFields: { name: org.name, type: org.type },
  });

  revalidatePath("/organisations");
  redirect(`/organisations/${org.id}`);
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

export async function archiveOrganizationAction(orgId: string) {
  const user = await requireUser();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!canArchiveRecord(user, { relationshipOwnerId: org.relationshipOwnerId, createdById: org.createdById })) {
    throw new PermissionError("You can only archive organisations you own or created.");
  }
  await prisma.organization.update({ where: { id: orgId }, data: { archivedAt: new Date() } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: orgId,
    action: "ARCHIVE",
  });
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${orgId}`);
}

export async function restoreOrganizationAction(orgId: string) {
  const user = await requireUser();
  if (!canRestoreArchived(user.role)) throw new PermissionError("Only administrators can restore archived records.");
  await prisma.organization.update({ where: { id: orgId }, data: { archivedAt: null } });
  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Organization",
    entityId: orgId,
    action: "RESTORE",
  });
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${orgId}`);
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
