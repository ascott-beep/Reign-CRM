"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canMutate, canArchiveRecord, canRestoreArchived, canMergeRecords, PermissionError } from "@/lib/permissions";
import { personFormSchema, employmentHistorySchema, candidateProfileSchema } from "@/lib/validation/person";
import { findPersonDuplicates } from "@/lib/duplicates";
import { writeAuditLog, diffFields } from "@/lib/audit";

export type PersonFormState = {
  errors?: Record<string, string[]>;
  duplicates?: Awaited<ReturnType<typeof findPersonDuplicates>>;
  formValues?: Record<string, unknown>;
};

export async function createPersonAction(_prev: PersonFormState, formData: FormData): Promise<PersonFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const rawWithArrays = { ...raw, personTypes: formData.getAll("personTypes") };
  const parsed = personFormSchema.safeParse(rawWithArrays);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]>, formValues: rawWithArrays };
  }
  const data = parsed.data;

  if (!data.confirmNotDuplicate) {
    const duplicates = await findPersonDuplicates(user.workspaceId, {
      firstName: data.firstName,
      lastName: data.lastName,
      primaryEmail: data.primaryEmail,
      linkedinUrl: data.linkedinUrl,
    });
    if (duplicates.length > 0) return { duplicates, formValues: rawWithArrays };
  }

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
      createdById: user.id,
      candidateProfile:
        data.createCandidateProfile || data.personTypes.includes("CANDIDATE")
          ? { create: { status: "PROSPECT", rating: "NOT_RATED", consentStatus: "NOT_REQUESTED", legalBasis: "NOT_SET" } }
          : undefined,
    },
  });

  await writeAuditLog({
    workspaceId: user.workspaceId,
    actorId: user.id,
    entityType: "Person",
    entityId: person.id,
    action: "CREATE",
    changedFields: { firstName: person.firstName, lastName: person.lastName },
  });

  revalidatePath("/people");
  redirect(`/people/${person.id}`);
}

export async function updatePersonAction(personId: string, _prev: PersonFormState, formData: FormData): Promise<PersonFormState> {
  const user = await requireUser();
  if (!canMutate(user.role)) throw new PermissionError();

  const raw = Object.fromEntries(formData.entries());
  const rawWithArrays = { ...raw, personTypes: formData.getAll("personTypes") };
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

export async function archivePersonAction(personId: string) {
  const user = await requireUser();
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId } });
  if (!canArchiveRecord(user, { relationshipOwnerId: person.relationshipOwnerId, createdById: person.createdById })) {
    throw new PermissionError("You can only archive people you own or created.");
  }
  await prisma.person.update({ where: { id: personId }, data: { archivedAt: new Date() } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Person", entityId: personId, action: "ARCHIVE" });
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

export async function restorePersonAction(personId: string) {
  const user = await requireUser();
  if (!canRestoreArchived(user.role)) throw new PermissionError("Only administrators can restore archived records.");
  await prisma.person.update({ where: { id: personId }, data: { archivedAt: null } });
  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Person", entityId: personId, action: "RESTORE" });
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
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
export async function mergePersonAction(survivorId: string, duplicateId: string) {
  const user = await requireUser();
  if (!canMergeRecords(user.role)) throw new PermissionError("Only administrators can merge records.");
  if (survivorId === duplicateId) throw new Error("Cannot merge a person with themselves.");

  await prisma.$transaction(async (tx) => {
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
    for (const model of [tx.activityPerson, tx.taskPerson, tx.documentPerson, tx.tagOnPerson] as const) {
      const rows = await (model as any).findMany({ where: { personId: duplicateId } });
      for (const row of rows) {
        const key = model === tx.activityPerson ? "activityId" : model === tx.taskPerson ? "taskId" : model === tx.documentPerson ? "documentId" : "tagId";
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
