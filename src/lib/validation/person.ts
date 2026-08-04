import { z } from "zod";
import { PersonType, PersonRelationshipStatus } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const personFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  preferredName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  pronouns: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  primaryEmail: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email").optional()),
  secondaryEmail: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email").optional()),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  linkedinUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  region: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  countryCode: z.preprocess(emptyToUndefined, z.string().trim().length(2).optional()),
  personTypes: z.preprocess(
    (v) => (Array.isArray(v) ? v : v ? [v] : []),
    z.array(z.nativeEnum(PersonType)).min(1, "Select at least one person type"),
  ),
  relationshipStatus: z.nativeEnum(PersonRelationshipStatus).default("RESEARCH_ONLY"),
  relationshipOwnerId: z.preprocess(emptyToUndefined, z.string().optional()),
  headlineOverride: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  currentOrganizationOverrideId: z.preprocess(emptyToUndefined, z.string().optional()),
  source: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  doNotContact: z.coerce.boolean().optional(),
  doNotContactReason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  createCandidateProfile: z.coerce.boolean().optional(),
  confirmNotDuplicate: z.coerce.boolean().optional(),
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
