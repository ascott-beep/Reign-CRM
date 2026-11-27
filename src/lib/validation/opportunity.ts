import { z } from "zod";
import { OpportunityType, OpportunityStage, OpportunitySource, EmploymentType } from "@prisma/client";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const CHANCE_OF_WINNING = { LOW: 25, MEDIUM: 50, HIGH: 75 } as const;

export const opportunityFormSchema = z.object({
  // Round 2 section 9 "Short create forms": name isn't one of the three fields on the
  // short form (company, role, fee) — left blank, the action derives "<role> · <company>".
  name: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
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
  // Round 4 screen 28 "New opportunity": stage as chips (one of the editable early
  // stages from Settings > Pipeline stages) and a short chance-of-winning band that
  // sets probabilityOverride directly, rather than free text or the stage default.
  stage: z.preprocess(emptyToUndefined, z.nativeEnum(OpportunityStage).optional()),
  chanceOfWinning: z.preprocess(emptyToUndefined, z.enum(["LOW", "MEDIUM", "HIGH"]).optional()),
  // Required on create only (enforced in createOpportunityAction) — "so nothing is created without one".
  firstNextStepTitle: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  firstNextStepDueDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
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

/** The open, editable early stages (Settings > Pipeline stages and the new-opportunity stage chips) — Won/Lost/On hold happen via their own buttons, not a stage picker. */
export const EDITABLE_STAGES: string[] = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS"];

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
  // d05 "Lost reason": revisit date is not stored on the opportunity, only used to create a task.
  revisitDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  onHoldReason: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  // d06 "On hold": stored on the opportunity and used to create the review task.
  holdReviewDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

/** d01 "Create mandate?" — overrides on top of what's carried over from the opportunity. */
export const createMandateFromOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
  title: z.string().trim().min(1),
  ownerId: z.string().min(1),
  engagementModel: z.enum(["RETAINED", "EXCLUSIVE_CONTINGENT", "CONTINGENT", "INTERIM"]),
  agreedFeeAmount: z.coerce.number().min(0).optional().nullable(),
  agreedFeeCurrency: z.string().length(3).optional(),
  minBaseAmount: z.coerce.number().min(0).optional().nullable(),
  maxBaseAmount: z.coerce.number().min(0).optional().nullable(),
  signedTerms: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()).default(false),
  startDate: z.coerce.date().optional().nullable(),
});
