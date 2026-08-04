import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const CANDIDATE_PROCESS_STAGE_ORDER = [
  "SOURCED",
  "LONGLISTED",
  "CONTACT_REQUIRED",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "SUBMITTED",
  "CLIENT_REVIEW",
  "FIRST_INTERVIEW",
  "FURTHER_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "PLACED",
];
export const CANDIDATE_PROCESS_TERMINAL_STAGES = ["ON_HOLD", "REJECTED", "WITHDRAWN"];
export const CANDIDATE_PROCESS_BOARD_STAGES = [...CANDIDATE_PROCESS_STAGE_ORDER, ...CANDIDATE_PROCESS_TERMINAL_STAGES];

export const addCandidateToMandateSchema = z.object({
  mandateId: z.string().min(1),
  candidatePersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  newCandidateFirstName: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  newCandidateLastName: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  newCandidateEmail: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().optional()),
  source: z.string().default("OTHER"),
});

export const processStageChangeSchema = z.object({
  candidateProcessId: z.string().min(1),
  toStage: z.string().min(1),
  rejectionReason: z.preprocess(emptyToUndefined, z.string().optional()),
  rejectionExplanation: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  withdrawalReason: z.preprocess(emptyToUndefined, z.string().optional()),
  withdrawalExplanation: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

export const processAssessmentSchema = z.object({
  candidateProcessId: z.string().min(1),
  overallScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  functionalFitScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  peExperienceScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  sectorFitScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  motivationScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  compensationFitScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  locationFitScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  assessmentSummary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  risksConcerns: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  clientFeedback: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const interviewFormSchema = z.object({
  candidateProcessId: z.string().min(1),
  type: z.string().min(1),
  roundNumber: z.coerce.number().int().min(1).default(1),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  locationOrLink: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  preparationNotes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const interviewOutcomeSchema = z.object({
  interviewId: z.string().min(1),
  outcome: z.string().min(1),
  candidateFeedback: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  clientFeedback: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  internalNotes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const offerFormSchema = z.object({
  candidateProcessId: z.string().min(1),
  status: z.string().default("PLANNED"),
  offerDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  expiryDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  baseAmount: z.coerce.number().min(0).optional().nullable(),
  baseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  bonusPercentage: z.coerce.number().min(0).optional().nullable(),
  proposedStartDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const placementFormSchema = z.object({
  candidateProcessId: z.string().min(1),
  acceptedOfferId: z.preprocess(emptyToUndefined, z.string().optional()),
  placementDate: z.coerce.date(),
  startDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  employmentType: z.string().min(1),
  agreedBaseAmount: z.coerce.number().min(0).optional().nullable(),
  agreedBaseCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  feeAmount: z.coerce.number().min(0).optional().nullable(),
  feeCurrency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  guaranteeMonths: z.coerce.number().int().min(0).optional().nullable(),
});
