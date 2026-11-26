import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteFileFromStorage } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

/** Section 10.1 "Download data" — everything held on a person, for a subject access request. */
export async function buildPersonDataExport(personId: string, workspaceId: string) {
  const person = await prisma.person.findFirstOrThrow({
    where: { id: personId, workspaceId },
    include: {
      candidateProfile: true,
      tags: { include: { tag: true } },
      documents: { include: { document: { select: { displayName: true, category: true, uploadedAt: true } } } },
      candidateProcesses: {
        include: { mandate: { select: { reference: true, title: true, hiringOrganization: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: { activity: { select: { type: true, subject: true, occurredAt: true, summary: true, fullNotes: true } } },
        orderBy: { activity: { occurredAt: "desc" } },
      },
      employmentHistories: { include: { organization: { select: { name: true } } }, orderBy: { startDate: "desc" } },
      placements: { select: { placementDate: true, feeAmount: true, feeCurrency: true, mandate: { select: { reference: true, title: true } } } },
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      firstName: person.firstName,
      middleName: person.middleName,
      lastName: person.lastName,
      preferredName: person.preferredName,
      pronouns: person.pronouns,
      primaryEmail: person.primaryEmail,
      secondaryEmail: person.secondaryEmail,
      primaryPhone: person.primaryPhone,
      secondaryPhone: person.secondaryPhone,
      linkedinUrl: person.linkedinUrl,
      city: person.city,
      region: person.region,
      countryCode: person.countryCode,
      languages: person.languages,
      personTypes: person.personTypes,
      relationshipStatus: person.relationshipStatus,
      headline: person.headlineOverride,
      source: person.source,
      sourceUrl: person.sourceUrl,
      summary: person.summary,
      contactPreferences: person.contactPreferences,
      doNotContact: person.doNotContact,
      doNotContactReason: person.doNotContactReason,
      tags: person.tags.map((t) => t.tag.name),
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    },
    consentAndLegalBasis: person.candidateProfile
      ? {
          consentStatus: person.candidateProfile.consentStatus,
          legalBasis: person.candidateProfile.legalBasis,
          consentRequestedDate: person.candidateProfile.consentRequestedDate,
          consentGrantedDate: person.candidateProfile.consentGrantedDate,
          consentExpiryDate: person.candidateProfile.consentExpiryDate,
          retentionReviewDate: person.candidateProfile.retentionReviewDate,
          privacyNotes: person.candidateProfile.privacyNotes,
        }
      : null,
    searchesTheyWereOn: person.candidateProcesses.map((cp) => ({
      mandateReference: cp.mandate.reference,
      mandateTitle: cp.mandate.title,
      organisation: cp.mandate.hiringOrganization.name,
      stage: cp.stage,
      addedOn: cp.createdAt,
      rejectionReason: cp.rejectionReason,
      withdrawalReason: cp.withdrawalReason,
    })),
    placements: person.placements.map((p) => ({
      mandateReference: p.mandate.reference,
      mandateTitle: p.mandate.title,
      placementDate: p.placementDate,
      feeAmount: p.feeAmount,
      feeCurrency: p.feeCurrency,
    })),
    employmentHistory: person.employmentHistories.map((e) => ({
      jobTitle: e.jobTitle,
      employer: e.organization?.name ?? e.employerNameFallback,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
    })),
    activityAndNotes: person.activities.map((a) => ({
      type: a.activity.type,
      subject: a.activity.subject,
      occurredAt: a.activity.occurredAt,
      summary: a.activity.summary,
      notes: a.activity.fullNotes,
    })),
    documents: person.documents.map((d) => ({
      name: d.document.displayName,
      category: d.document.category,
      uploadedAt: d.document.uploadedAt,
    })),
  };
}

/**
 * Section 10.1 GDPR erasure — "'Delete now' in Recently deleted removes a person
 * permanently straight away." Only usable on an already-archived person (never a
 * placed candidate: Placement.candidatePersonId has no cascade, so the delete
 * below fails loudly rather than silently if that's ever not true). Everything
 * genuinely owned by the person (candidate profile, employment history, activity
 * links, tags, custom field values) cascades from the schema; references from
 * other live records (stakeholder entries, lead-contact/hiring-manager picks,
 * old candidate-process rows) are cleared first so the delete can proceed.
 */
export async function erasePersonRecord(personId: string, workspaceId: string, actorId: string) {
  const person = await prisma.person.findFirstOrThrow({ where: { id: personId, workspaceId } });
  if (!person.archivedAt) throw new Error("Only an already-deleted person can be erased for good.");

  await prisma.$transaction([
    prisma.candidateProcess.deleteMany({ where: { candidatePersonId: personId } }),
    prisma.candidateProcess.updateMany({ where: { sourcePersonId: personId }, data: { sourcePersonId: null } }),
    prisma.opportunity.updateMany({ where: { leadContactPersonId: personId }, data: { leadContactPersonId: null } }),
    prisma.opportunity.updateMany({ where: { sourcePersonId: personId }, data: { sourcePersonId: null } }),
    prisma.mandate.updateMany({ where: { hiringManagerPersonId: personId }, data: { hiringManagerPersonId: null } }),
    prisma.mandate.updateMany({ where: { internalTalentPersonId: personId }, data: { internalTalentPersonId: null } }),
    prisma.mandateStakeholder.deleteMany({ where: { personId } }),
    prisma.opportunityStakeholder.deleteMany({ where: { personId } }),
    prisma.interviewExternalParticipant.deleteMany({ where: { personId } }),
    prisma.intelligenceItem.updateMany({ where: { sourcePersonId: personId }, data: { sourcePersonId: null } }),
    prisma.person.updateMany({ where: { sourcePersonId: personId }, data: { sourcePersonId: null } }),
    prisma.employmentHistoryInvestor.updateMany({ where: { relatedPersonId: personId }, data: { relatedPersonId: null } }),
  ]);

  // A document kept only for this person is erased outright (row + stored file);
  // one shared with an organisation, mandate or opportunity just loses this link.
  const docLinks = await prisma.documentPerson.findMany({ where: { personId }, select: { documentId: true } });
  for (const { documentId } of docLinks) {
    const [orgLinks, oppLinks, mandateLinks, personLinks] = await Promise.all([
      prisma.documentOrganization.count({ where: { documentId } }),
      prisma.documentOpportunity.count({ where: { documentId } }),
      prisma.documentMandate.count({ where: { documentId } }),
      prisma.documentPerson.count({ where: { documentId } }),
    ]);
    if (orgLinks === 0 && oppLinks === 0 && mandateLinks === 0 && personLinks <= 1) {
      const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { storageKey: true } });
      if (doc) await deleteFileFromStorage(doc.storageKey).catch(() => {});
      await prisma.document.delete({ where: { id: documentId } }).catch(() => {});
    }
  }

  await prisma.person.delete({ where: { id: personId } });
  // No changedFields — the entry itself must carry no personal data about the erased person.
  await writeAuditLog({ workspaceId, actorId, entityType: "Person", entityId: personId, action: "DELETE" });
}

/**
 * Section 10.1 — the alternative to deletion for a placed candidate: wipes
 * identifying details in place and keeps the placement/fee figures untouched.
 */
export async function anonymisePersonRecord(personId: string, workspaceId: string, actorId: string) {
  await prisma.person.findFirstOrThrow({ where: { id: personId, workspaceId } });

  await prisma.person.update({
    where: { id: personId },
    data: {
      firstName: "Erased",
      lastName: "person",
      middleName: null,
      preferredName: null,
      pronouns: null,
      primaryEmail: null,
      secondaryEmail: null,
      primaryPhone: null,
      secondaryPhone: null,
      linkedinUrl: null,
      city: null,
      region: null,
      countryCode: null,
      languages: [],
      headlineOverride: null,
      source: null,
      sourceUrl: null,
      summary: null,
      contactPreferences: null,
      doNotContact: true,
    },
  });

  await writeAuditLog({ workspaceId, actorId, entityType: "Person", entityId: personId, action: "PRIVACY_ACTION" });
}
