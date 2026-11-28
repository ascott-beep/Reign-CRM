import { z } from "zod";
import { OrganizationType, OrganizationStatus, PortfolioClassification, AccountPriority } from "@prisma/client";
import { cleanDashes } from "@/lib/validation/clean-text";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

/** Round 5 Part A item 16 — accepts a bare domain like "halcyonpartners.com"; adds https:// ourselves. */
function addProtocol(v: unknown): unknown {
  const value = emptyToUndefined(v);
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const organizationFormSchema = z.object({
  name: z.preprocess(cleanDashes, z.string().trim().min(1, "Name is required").max(300)),
  type: z.nativeEnum(OrganizationType),
  status: z.nativeEnum(OrganizationStatus).default("RESEARCH"),
  website: z.preprocess(addProtocol, z.string().trim().url("Enter a valid website").optional()),
  linkedinUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  hqCity: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  hqRegion: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  hqCountryCode: z.preprocess(emptyToUndefined, z.string().trim().length(2).optional()),
  employeeCountMin: z.coerce.number().int().min(0).optional().nullable(),
  employeeCountMax: z.coerce.number().int().min(0).optional().nullable(),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  internalSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  accountPriority: z.nativeEnum(AccountPriority).default("UNSCORED"),
  relationshipOwnerId: z.preprocess(emptyToUndefined, z.string().optional()),
  source: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
  ownershipTypeId: z.preprocess(emptyToUndefined, z.string().optional()),
  sectorId: z.preprocess(emptyToUndefined, z.string().optional()),
  sectorIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),

  // Fund-only
  fundVintageOrCurrentFundName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  aumAmount: z.coerce.number().min(0).optional().nullable(),
  aumCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  // Round 5 Part D — separate from the combined field above.
  currentFundName: z.preprocess(cleanDashes, z.string().trim().max(200).optional()),
  fundSizeAmount: z.coerce.number().min(0).optional().nullable(),
  fundSizeCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  // An empty string coerces to 0 via z.coerce.number(), which would then fail
  // min(1950) -- unlike the min(0) numeric fields nearby, so this one needs
  // emptyToUndefined first to actually be optional.
  fundVintageYear: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1950).max(2100).optional().nullable()),
  typicalMinEquityChequeAmount: z.coerce.number().min(0).optional().nullable(),
  typicalMinEquityChequeCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  typicalMaxEquityChequeAmount: z.coerce.number().min(0).optional().nullable(),
  typicalMaxEquityChequeCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  investmentRegions: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  countriesOfOperation: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  investorStrategyIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),
  hiringPracticeAreaIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),

  // Portfolio-company-only
  portfolioClassification: z.preprocess(emptyToUndefined, z.nativeEnum(PortfolioClassification).optional()),
  businessModelSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  investmentThesisSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  ebitdaAmount: z.coerce.number().min(0).optional().nullable(),
  ebitdaCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  revenueAmount: z.coerce.number().min(0).optional().nullable(),
  revenueCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  likelyExitWindow: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  // Round 5 Part D — ownership, recorded as an OrganizationRelationship to the owning fund.
  ownedByOrganizationId: z.preprocess(emptyToUndefined, z.string().optional()),
  fundVehicleName: z.preprocess(cleanDashes, z.string().trim().max(200).optional()),
  dealType: z.preprocess(emptyToUndefined, z.string().optional()),
  ownershipLevel: z.preprocess(emptyToUndefined, z.string().optional()),
  investedDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  coInvestorOrganizationIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).optional(),

  confirmNotDuplicate: z.coerce.boolean().optional(),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const organizationRelationshipSchema = z.object({
  sourceOrganizationId: z.string().min(1),
  targetOrganizationId: z.string().min(1),
  type: z.string().min(1),
  investmentStatus: z.preprocess(emptyToUndefined, z.string().optional()),
  investmentDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  exitDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  ownershipPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  isLeadInvestor: z.coerce.boolean().optional(),
  investmentAmount: z.coerce.number().min(0).optional().nullable(),
  investmentCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});
