"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canMergeRecords, PermissionError } from "@/lib/permissions";
import { personFormSchema, employmentHistorySchema, candidateProfileSchema } from "@/lib/validation/person";
import { findPersonDuplicates } from "@/lib/duplicates";
import { writeAuditLog, diffFields } from "@/lib/audit";
import { areaNameForPractice, PRACTICES, type Practice } from "@/lib/practices";

export type PersonFormState = {
  errors?: Record<string, string[]>;
  duplicates?: Awaited<ReturnType<typeof findPersonDuplicates>>;
  formValues?: Record<string, unknown>;
};

/** Object.fromEntries would silently keep only the last value for a repeated name (an array field's several hidden inputs) -- getAll per key keeps every one. */
function readForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  return raw;
}

async function practiceAreaIdsForPractices(workspaceId: string, practices: string[]): Promise<string[]> {
  const names = practices.filter((p): p is Practice => (PRACTICES as readonly string[]).includes(p)).map(areaNameForPractice);
  if (names.length === 0) return [];
  const rows = await prisma.practiceArea.findMany({ where: { workspaceId, name: { in: names } }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function syncPersonPracticeAreas(personId: string, workspaceId: string, practiceKeys: string[] | undefined) {
  if (!practiceKeys) return;
  const practiceAreaIds = await practiceAreaIdsForPractices(workspaceId, practiceKeys);
  await prisma.personPracticeArea.deleteMany({ where: { personId } });
  if (practiceAreaIds.length > 0) {
    await prisma.personPracticeArea.createMany({ data: practiceAreaIds.map((practiceAreaId) => ({ personId, practiceAreaId })) });
  }
}

export async function createPersonAction(_prev: PersonFormState, formData: FormData): Promise<PersonFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const rawWithArrays = readForm(formData);
  const parsed = personFormSchema.safeParse(rawWithArrays);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: rawWithArrays };
  }
  const data = parsed.data;

  // Round 4 screen 26: the duplicate banner on this form is advisory and live
  // (checked as you type via /api/people/duplicate-check) -- it never blocks
  // saving, so the create itself no longer gates on a server-side duplicate
  // check the way earlier rounds did.

  // Round 5 Part D: personCategory is now the primary "Who are they" choice,
  // but personTypes (the older multi-select) is kept in sync too so existing
  // list-page tab counts and filters built on it keep working.
  const personTypes = data.personCategory
    ? data.personCategory === "OTHER"
      ? ["OTHER" as const]
      : [data.personCategory]
    : data.personTypes;

  const isCandidate = data.personCategory === "CANDIDATE" || (!data.personCategory && data.personTypes.includes("CANDIDATE"));
  const isClientContact = data.personCategory === "CLIENT_CONTACT" || (!data.personCategory && data.personTypes.includes("CLIENT_CONTACT"));

  const person = await prisma.person.create({
    data: {
      workspaceId: user.workspaceId,
      firstName: data.firstName,
      lastName: data.lastName,
      preferredName: data.preferredName ?? null,
      pronouns: data.pronouns ?? null,
      primaryEmail: data.primaryEmail ?? null,
      secondaryEmail: data.secondaryEmail ?? null,
      primaryPhone: data.primaryPhone ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      countryCode: data.countryCode ?? null,
      languages: data.languages ?? [],
      personTypes,
      personCategory: data.personCategory ?? null,
      relationshipStatus: data.relationshipStatus,
      relationshipOwnerId: data.relationshipOwnerId ?? null,
      headlineOverride: data.currentTitle ?? data.headlineOverride ?? null,
      currentOrganizationOverrideId: data.currentOrganizationOverrideId ?? null,
      source: data.source ?? null,
      sourceUrl: data.sourceUrl ?? null,
      summary: data.summary ?? null,
      doNotContact: data.doNotContact ?? false,
      doNotContactReason: data.doNotContactReason ?? null,
      createdById: user.id,
      candidateProfile:
        data.createCandidateProfile || isCandidate
          ? {
              create: {
                status: "PROSPECT",
                rating: "NOT_RATED",
                consentStatus: "NOT_REQUESTED",
                legalBasis: "NOT_SET",
                peBackedRolesCount: data.peBackedRolesCount ?? null,
                exitsDelivered: data.exitsDelivered ?? null,
                totalYearsExperience: data.yearsInRole ?? null,
                dealExperience: (data.dealExperience as never) ?? [],
                equityType: (data.equityType as never) ?? null,
                openTo: (data.openTo as never) ?? [],
                lookingStatus: (data.lookingStatus as never) ?? null,
                currentBaseAmount: data.currentBaseAmount ?? null,
                currentBaseCurrency: data.currentBaseCurrency ?? null,
                currentBonusPercentage: data.currentBonusPercentage ?? null,
                noticePeriodValue: data.noticePeriodValue ?? null,
                noticePeriodUnit: data.noticePeriodUnit ?? null,
                preferredCountries: data.preferredCountries ?? [],
                sectorExperience:
                  data.candidateSectorIds && data.candidateSectorIds.length > 0
                    ? { create: data.candidateSectorIds.map((sectorId) => ({ sectorId })) }
                    : undefined,
              },
            }
          : undefined,
      clientContactProfile: isClientContact
        ? {
            create: {
              roleAtFirm: (data.roleAtFirm as never) ?? null,
              relationship: (data.contactRelationship as never) ?? null,
              decisionRole: (data.decisionRole as never) ?? null,
              coveredPortfolioCompanies:
                data.coveredPortfolioCompanyIds && data.coveredPortfolioCompanyIds.length > 0
                  ? { create: data.coveredPortfolioCompanyIds.map((organizationId) => ({ organizationId })) }
                  : undefined,
            },
          }
        : undefined,
    },
  });

  await syncPersonPracticeAreas(person.id, user.workspaceId, data.practiceAreaIds);

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: person.id,
    action: "CREATE",
    changedFields: { firstName: person.firstName, lastName: person.lastName },
  });

  revalidatePath("/people");
  if (formData.get("intent") === "another") {
    redirect(`/people/new?created=${encodeURIComponent("Person added")}`);
  }
  redirect(`/people/${person.id}?created=${encodeURIComponent("Person added")}`);
}

export async function updatePersonAction(personId: string, _prev: PersonFormState, formData: FormData): Promise<PersonFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const rawWithArrays = readForm(formData);
  const parsed = personFormSchema.safeParse(rawWithArrays);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: rawWithArrays };
  }
  const data = parsed.data;
  const before = await prisma.person.findUniqueOrThrow({ where: { id: personId } });

  const updated = await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      preferredName: data.preferredName ?? null,
      pronouns: data.pronouns ?? null,
      primaryEmail: data.primaryEmail ?? null,
      secondaryEmail: data.secondaryEmail ?? null,
      primaryPhone: data.primaryPhone ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      countryCode: data.countryCode ?? null,
      personTypes: data.personTypes,
      relationshipStatus: data.relationshipStatus,
      relationshipOwnerId: data.relationshipOwnerId ?? null,
      headlineOverride: data.headlineOverride ?? null,
      currentOrganizationOverrideId: data.currentOrganizationOverrideId ?? null,
      source: data.source ?? null,
      sourceUrl: data.sourceUrl ?? null,
      summary: data.summary ?? null,
      doNotContact: data.doNotContact ?? false,
      doNotContactReason: data.doNotContactReason ?? null,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: personId,
    action: "UPDATE",
    changedFields: diffFields(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
  });

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

export async function addEmploymentHistoryAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = employmentHistorySchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  if (data.isCurrent) {
    await prisma.employmentHistory.updateMany({ where: { personId: data.personId, isCurrent: true }, data: { isCurrent: false } });
  }

  await prisma.employmentHistory.create({
    data: {
      personId: data.personId,
      organizationId: data.organizationId ?? null,
      employerNameFallback: data.employerNameFallback ?? null,
      jobTitle: data.jobTitle,
      seniority: (data.seniority as any) ?? null,
      employmentType: (data.employmentType as any) ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      isCurrent: data.isCurrent ?? false,
      city: data.city ?? null,
      countryCode: data.countryCode ?? null,
      workArrangement: (data.workArrangement as any) ?? null,
      responsibilities: data.responsibilities ?? null,
      peBackedDuringTenure: data.peBackedDuringTenure ?? null,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: data.personId,
    action: "UPDATE",
    changedFields: { employmentHistoryAdded: data.jobTitle },
  });

  revalidatePath(`/people/${data.personId}`);
}

export async function upsertCandidateProfileAction(formData: FormData) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateProfileSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  const data = parsed.data;

  await prisma.candidateProfile.upsert({
    where: { personId: data.personId },
    update: {
      status: data.status as any,
      rating: data.rating as any,
      totalYearsExperience: data.totalYearsExperience ?? null,
      currentBaseAmount: data.currentBaseAmount ?? null,
      currentBaseCurrency: data.currentBaseCurrency ?? null,
      expectedBaseAmount: data.expectedBaseAmount ?? null,
      expectedBaseCurrency: data.expectedBaseCurrency ?? null,
      noticePeriodValue: data.noticePeriodValue ?? null,
      noticePeriodUnit: data.noticePeriodUnit ?? null,
      careerSummary: data.careerSummary ?? null,
      motivation: data.motivation ?? null,
      willRelocate: data.willRelocate ?? null,
      consentStatus: data.consentStatus as any,
      legalBasis: data.legalBasis as any,
      lastQualifiedAt: data.status === "QUALIFIED" ? new Date() : undefined,
      qualifiedById: data.status === "QUALIFIED" ? user.id : undefined,
    },
    create: {
      personId: data.personId,
      status: data.status as any,
      rating: data.rating as any,
      totalYearsExperience: data.totalYearsExperience ?? null,
      currentBaseAmount: data.currentBaseAmount ?? null,
      currentBaseCurrency: data.currentBaseCurrency ?? null,
      expectedBaseAmount: data.expectedBaseAmount ?? null,
      expectedBaseCurrency: data.expectedBaseCurrency ?? null,
      noticePeriodValue: data.noticePeriodValue ?? null,
      noticePeriodUnit: data.noticePeriodUnit ?? null,
      careerSummary: data.careerSummary ?? null,
      motivation: data.motivation ?? null,
      willRelocate: data.willRelocate ?? null,
      consentStatus: data.consentStatus as any,
      legalBasis: data.legalBasis as any,
    },
  });

  await prisma.person.update({
    where: { id: data.personId },
    data: { personTypes: { push: "CANDIDATE" } },
  }).catch(() => {});

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "CandidateProfile",
    entityId: data.personId,
    action: "UPDATE",
  });

  revalidatePath(`/people/${data.personId}`);
}

/**
 * Merge a duplicate person into a survivor: reassign relationships, dedupe
 * tags/associations, preserve every process/activity/task/document record,
 * then archive the duplicate. Admin-only, single transaction.
 */
export async function mergePersonAction(
  survivorId: string,
  duplicateId: string,
  survivorFieldOverrides?: { firstName?: string; lastName?: string; headlineOverride?: string | null; relationshipStatus?: string; relationshipOwnerId?: string | null; rating?: string },
) {
  const user = await requireUser();
  if (!canMergeRecords(user.role)) throw new PermissionError("Only administrators can merge records.");
  if (survivorId === duplicateId) throw new Error("Cannot merge a person with themselves.");

  await prisma.$transaction(async (tx) => {
    if (survivorFieldOverrides) {
      const { rating, ...personFields } = survivorFieldOverrides;
      await tx.person.update({ where: { id: survivorId }, data: personFields as any });
      if (rating) {
        await tx.candidateProfile.updateMany({ where: { personId: survivorId }, data: { rating: rating as any } });
      }
    }

    await tx.employmentHistory.updateMany({ where: { personId: duplicateId }, data: { personId: survivorId } });
    await tx.personOrganizationAssociation.updateMany({ where: { personId: duplicateId }, data: { personId: survivorId } });
    await tx.candidateProcess.updateMany({ where: { candidatePersonId: duplicateId }, data: { candidatePersonId: survivorId } });
    await tx.opportunity.updateMany({ where: { leadContactPersonId: duplicateId }, data: { leadContactPersonId: survivorId } });
    await tx.opportunity.updateMany({ where: { sourcePersonId: duplicateId }, data: { sourcePersonId: survivorId } });
    await tx.mandate.updateMany({ where: { hiringManagerPersonId: duplicateId }, data: { hiringManagerPersonId: survivorId } });
    await tx.mandate.updateMany({ where: { internalTalentPersonId: duplicateId }, data: { internalTalentPersonId: survivorId } });
    await tx.intelligenceItem.updateMany({ where: { sourcePersonId: duplicateId }, data: { sourcePersonId: survivorId } });
    await tx.offLimitsRestriction.updateMany({ where: { personId: duplicateId }, data: { personId: survivorId } });

    // Join tables with composite uniqueness: reassign only where the survivor
    // doesn't already have the same link, then drop the now-redundant rows.
    for (const model of [tx.activityPerson, tx.taskPerson, tx.documentPerson, tx.tagOnPerson, tx.personPracticeArea] as const) {
      const rows = await (model as any).findMany({ where: { personId: duplicateId } });
      for (const row of rows) {
        const key =
          model === tx.activityPerson
            ? "activityId"
            : model === tx.taskPerson
              ? "taskId"
              : model === tx.documentPerson
                ? "documentId"
                : model === tx.tagOnPerson
                  ? "tagId"
                  : "practiceAreaId";
        const existing = await (model as any).findFirst({ where: { personId: survivorId, [key]: row[key] } });
        if (existing) {
          await (model as any).delete({ where: { id: row.id } });
        } else {
          await (model as any).update({ where: { id: row.id }, data: { personId: survivorId } });
        }
      }
    }

    for (const model of [tx.opportunityStakeholder, tx.mandateStakeholder, tx.interviewExternalParticipant] as const) {
      const rows = await (model as any).findMany({ where: { personId: duplicateId } });
      for (const row of rows) {
        const key = model === tx.opportunityStakeholder ? "opportunityId" : model === tx.mandateStakeholder ? "mandateId" : "interviewId";
        const existing = await (model as any).findFirst({ where: { personId: survivorId, [key]: row[key] } });
        if (existing) {
          await (model as any).delete({ where: { id: row.id } });
        } else {
          await (model as any).update({ where: { id: row.id }, data: { personId: survivorId } });
        }
      }
    }

    await tx.person.update({ where: { id: duplicateId }, data: { archivedAt: new Date(), doNotContact: false } });

    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Person",
        entityId: survivorId,
        action: "UPDATE",
        changedFields: { mergedFrom: duplicateId },
      },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Person",
        entityId: duplicateId,
        action: "ARCHIVE",
        changedFields: { mergedInto: survivorId },
      },
    });
  });

  revalidatePath(`/people/${survivorId}`);
  revalidatePath("/people");
  redirect(`/people/${survivorId}`);
}

export async function togglePersonPracticeAreaAction(personId: string, practiceAreaId: string) {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const person = await prisma.person.findFirst({ where: { id: personId, workspaceId: user.workspaceId } });
  if (!person) throw new Error("Person not found.");

  const existing = await prisma.personPracticeArea.findUnique({
    where: { personId_practiceAreaId: { personId, practiceAreaId } },
  });
  if (existing) {
    await prisma.personPracticeArea.delete({ where: { id: existing.id } });
  } else {
    await prisma.personPracticeArea.create({ data: { personId, practiceAreaId } });
  }

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
}
