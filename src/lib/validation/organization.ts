import { z } from "zod";
import { OrganizationType, OrganizationStatus, PortfolioClassification, AccountPriority } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  type: z.nativeEnum(OrganizationType),
  status: z.nativeEnum(OrganizationStatus).default("RESEARCH"),
  website: z.preprocess(emptyToUndefined, z.string().trim().url("Enter a valid URL").optional()),
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

  // Fund-only
  fundVintageOrCurrentFundName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  aumAmount: z.coerce.number().min(0).optional().nullable(),
  aumCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),

  // Portfolio-company-only
  portfolioClassification: z.preprocess(emptyToUndefined, z.nativeEnum(PortfolioClassification).optional()),
  businessModelSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  investmentThesisSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),

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
