import { z } from "zod";
import { MandatePriority, MandateConfidentiality, EngagementModel, FeeType, EmploymentType, WorkArrangement, Seniority, MandateSource } from "@prisma/client";
import { cleanDashes } from "@/lib/validation/clean-text";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const mandateFormSchema = z.object({
  title: z.preprocess(cleanDashes, z.string().trim().min(1, "Title is required").max(200)),
  hiringOrganizationId: z.string().min(1, "Hiring organisation is required"),
  // Separate from the hiring organisation (the fund/client commissioning the search):
  // the portfolio company the role actually sits at, when that's a distinct organisation.
  portfolioCompanyId: z.preprocess(emptyToUndefined, z.string().optional()),
  // Round 5 screen 10: the practice key (FINANCE/COMMERCIAL/...), resolved to an
  // actual PracticeArea row id server-side — see practiceAreaIdForPracticeKey.
  practiceAreaId: z.preprocess(emptyToUndefined, z.string().optional()),
  // Section 5 rule 4: required when creating a mandate directly (no source opportunity) —
  // enforced in createMandateAction, not here, since editing a mandate that already has a
  // source opportunity should not be forced to pick one of these instead.
  source: z.preprocess(emptyToUndefined, z.nativeEnum(MandateSource).optional()),
  priority: z.nativeEnum(MandatePriority).default("NORMAL"),
  confidentiality: z.nativeEnum(MandateConfidentiality).default("OPEN"),
  ownerId: z.string().min(1),
  hiringManagerPersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  internalTalentPersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  seniority: z.preprocess(emptyToUndefined, z.nativeEnum(Seniority).optional()),
  employmentType: z.nativeEnum(EmploymentType).default("PERMANENT"),
  numberOfHires: z.coerce.number().int().min(1).default(1),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  countryCode: z.preprocess(emptyToUndefined, z.string().trim().length(2).optional()),
  workArrangement: z.preprocess(emptyToUndefined, z.nativeEnum(WorkArrangement).optional()),
  roleSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  businessContext: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  requiredExperience: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  minBaseAmount: z.coerce.number().min(0).optional().nullable(),
  maxBaseAmount: z.coerce.number().min(0).optional().nullable(),
  baseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  engagementModel: z.nativeEnum(EngagementModel).default("RETAINED"),
  feeType: z.nativeEnum(FeeType).default("PERCENTAGE_OF_BASE"),
  feePercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  signedTerms: z.coerce.boolean().optional(),
  targetShortlistDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  targetCompletionDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  /** Round 4 screen 29 "Edit mandate": existing workspace tags only, picked from Settings > Lists and tags. */
  tagIds: z.array(z.string()).optional().default([]),
});

export const MANDATE_STATUS_ORDER = [
  "BRIEF_RECEIVED",
  "SEARCH_ACTIVE",
  "LONGLISTING",
  "SHORTLISTING",
  "INTERVIEWING",
  "OFFER",
  "FILLED",
  "CANCELLED",
  "ON_HOLD",
];

export const mandateStatusChangeSchema = z.object({
  mandateId: z.string().min(1),
  toStatus: z.string().min(1),
  cancellationReason: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  onHoldReason: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});
