import { z } from "zod";
import { PersonType, PersonRelationshipStatus } from "@prisma/client";
import { cleanDashes } from "@/lib/validation/clean-text";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const personFormSchema = z.object({
  firstName: z.preprocess(cleanDashes, z.string().trim().min(1, "First name is required").max(120)),
  lastName: z.preprocess(cleanDashes, z.string().trim().min(1, "Last name is required").max(120)),
  preferredName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  pronouns: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  primaryEmail: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email").optional()),
  secondaryEmail: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email").optional()),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  linkedinUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  region: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  countryCode: z.preprocess(emptyToUndefined, z.string().trim().length(2).optional()),
  // Round 5 Part D: the create form now submits personCategory instead (below),
  // which createPersonAction derives this from -- optional here so it no
  // longer blocks a submit that only sends personCategory.
  personTypes: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.nativeEnum(PersonType))).optional().default([]),
  relationshipStatus: z.nativeEnum(PersonRelationshipStatus).default("RESEARCH_ONLY"),
  relationshipOwnerId: z.preprocess(emptyToUndefined, z.string().optional()),
  headlineOverride: z.preprocess((v) => emptyToUndefined(cleanDashes(v)), z.string().trim().max(200).optional()),
  currentOrganizationOverrideId: z.preprocess(emptyToUndefined, z.string().optional()),
  source: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  doNotContact: z.coerce.boolean().optional(),
  doNotContactReason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  createCandidateProfile: z.coerce.boolean().optional(),
  confirmNotDuplicate: z.coerce.boolean().optional(),

  // Round 5 Part D — "Who are they" single choice, plus the fields each branch shows.
  personCategory: z.preprocess(emptyToUndefined, z.enum(["CANDIDATE", "CLIENT_CONTACT", "OTHER"]).optional()),
  practiceAreaIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  currentTitle: z.preprocess((v) => emptyToUndefined(cleanDashes(v)), z.string().trim().max(200).optional()),
  seniority: z.preprocess(emptyToUndefined, z.string().optional()),

  // Candidate-only
  peBackedRolesCount: z.coerce.number().int().min(0).optional().nullable(),
  exitsDelivered: z.coerce.number().int().min(0).optional().nullable(),
  yearsInRole: z.coerce.number().int().min(0).optional().nullable(),
  dealExperience: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  candidateSectorIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  currentBaseAmount: z.coerce.number().min(0).optional().nullable(),
  currentBaseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  currentBonusPercentage: z.coerce.number().min(0).max(1000).optional().nullable(),
  equityType: z.preprocess(emptyToUndefined, z.string().optional()),
  noticePeriodValue: z.coerce.number().int().min(0).optional().nullable(),
  noticePeriodUnit: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  openTo: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  lookingStatus: z.preprocess(emptyToUndefined, z.string().optional()),
  preferredCountries: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  languages: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),

  // Client contact-only
  roleAtFirm: z.preprocess(emptyToUndefined, z.string().optional()),
  coveredPortfolioCompanyIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  contactRelationship: z.preprocess(emptyToUndefined, z.string().optional()),
  decisionRole: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;

export const employmentHistorySchema = z.object({
  personId: z.string().min(1),
  organizationId: z.preprocess(emptyToUndefined, z.string().optional()),
  employerNameFallback: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  seniority: z.preprocess(emptyToUndefined, z.string().optional()),
  employmentType: z.preprocess(emptyToUndefined, z.string().optional()),
  startDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  endDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  isCurrent: z.coerce.boolean().optional(),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  countryCode: z.preprocess(emptyToUndefined, z.string().trim().length(2).optional()),
  workArrangement: z.preprocess(emptyToUndefined, z.string().optional()),
  responsibilities: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  peBackedDuringTenure: z.preprocess((v) => (v === "" || v === undefined ? undefined : v === "true"), z.boolean().optional()),
});

export const candidateProfileSchema = z.object({
  personId: z.string().min(1),
  status: z.string().min(1),
  rating: z.string().min(1),
  totalYearsExperience: z.coerce.number().int().min(0).optional().nullable(),
  currentBaseAmount: z.coerce.number().min(0).optional().nullable(),
  currentBaseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  expectedBaseAmount: z.coerce.number().min(0).optional().nullable(),
  expectedBaseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  noticePeriodValue: z.coerce.number().int().min(0).optional().nullable(),
  noticePeriodUnit: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  careerSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  motivation: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  willRelocate: z.preprocess((v) => (v === "" || v === undefined ? undefined : v === "true"), z.boolean().optional()),
  consentStatus: z.string().min(1),
  legalBasis: z.string().min(1),
});
