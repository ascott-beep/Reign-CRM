import { z } from "zod";
import { OpportunityType, OpportunityStage, OpportunitySource, EmploymentType } from "@prisma/client";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const opportunityFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  hiringOrganizationId: z.string().min(1, "Hiring organisation is required"),
  type: z.nativeEnum(OpportunityType).default("UNKNOWN"),
  potentialRoleTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  employmentType: z.preprocess(emptyToUndefined, z.nativeEnum(EmploymentType).optional()),
  source: z.nativeEnum(OpportunitySource).default("OTHER"),
  leadContactPersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  ownerId: z.string().min(1),
  estimatedFeeAmount: z.coerce.number().min(0).optional().nullable(),
  estimatedFeeCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  expectedDecisionDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  nextStepSummary: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const STAGE_ORDER: string[] = [
  "SIGNAL_IDENTIFIED",
  "CONTACT_IDENTIFIED",
  "CONTACTED",
  "DISCOVERY_ARRANGED",
  "QUALIFIED",
  "PROPOSAL_OR_TERMS",
  "WON",
  "LOST",
  "ON_HOLD",
];

/**
 * Admins can override default stage probabilities in Settings > Opportunities
 * (Workspace.opportunityStageProbabilities); pass that map in when available.
 */
export function defaultProbabilityFor(stage: string, overrides?: Record<string, number> | null) {
  return overrides?.[stage] ?? OPPORTUNITY_STAGE_PROBABILITY[stage] ?? 0;
}

export const stageChangeSchema = z.object({
  opportunityId: z.string().min(1),
  toStage: z.nativeEnum(OpportunityStage),
  lossReason: z.preprocess(emptyToUndefined, z.string().optional()),
  lossExplanation: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  onHoldReason: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});
