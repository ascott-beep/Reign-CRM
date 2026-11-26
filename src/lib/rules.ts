/**
 * Shared business rules (SPEC.md section 5). The board, lists, overview and
 * reports all read from here so they agree on wording and numbers.
 */
import type { CandidateProcessStage, CandidateRating, OpportunityStage } from "@prisma/client";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";

export const STALE_THRESHOLDS = {
  opportunityDays: 30,
  organizationVerificationDays: 60,
};

// ---------------------------------------------------------------------------
// Candidate stages → 6 steps shown to users (the 16 stored stages stay as-is)
// ---------------------------------------------------------------------------

export const CANDIDATE_STEP_COUNT = 6;

const CANDIDATE_STEP: Record<CandidateProcessStage, { step: number; label: string } | null> = {
  SOURCED: { step: 1, label: "Identified" },
  LONGLISTED: { step: 1, label: "Identified" },
  CONTACT_REQUIRED: { step: 2, label: "Approached" },
  CONTACTED: { step: 2, label: "Approached" },
  INTERESTED: { step: 2, label: "Approached" },
  QUALIFIED: { step: 3, label: "Qualified" },
  SUBMITTED: { step: 4, label: "With client" },
  CLIENT_REVIEW: { step: 4, label: "With client" },
  FIRST_INTERVIEW: { step: 5, label: "Interviewing" },
  FURTHER_INTERVIEW: { step: 5, label: "Interviewing" },
  FINAL_INTERVIEW: { step: 5, label: "Interviewing" },
  OFFER: { step: 6, label: "Offer / placed" },
  PLACED: { step: 6, label: "Offer / placed" },
  // Hidden by default — no longer in the active process
  ON_HOLD: null,
  REJECTED: null,
  WITHDRAWN: null,
};

/** Returns null for stages hidden by default (on hold, rejected, withdrawn). */
export function candidateStep(stage: CandidateProcessStage): { step: number; label: string } | null {
  return CANDIDATE_STEP[stage];
}

export function isCandidateHidden(stage: CandidateProcessStage): boolean {
  return CANDIDATE_STEP[stage] === null;
}

/** "In play" = still an active candidate on the search (not placed, not hidden). */
export function isCandidateInPlay(stage: CandidateProcessStage): boolean {
  return !isCandidateHidden(stage) && stage !== "PLACED";
}

/** Plain-English "Where they are" status shown on the Candidates tab. */
export function candidatePlainStatus(stage: CandidateProcessStage): { label: string; tone: "warning" | "success" | "neutral" } {
  switch (stage) {
    case "CONTACT_REQUIRED":
      return { label: "Not contacted yet", tone: "warning" };
    case "CONTACTED":
      return { label: "Awaiting reply", tone: "neutral" };
    case "INTERESTED":
      return { label: "Interested", tone: "neutral" };
    case "FIRST_INTERVIEW":
      return { label: "First interview", tone: "neutral" };
    case "FURTHER_INTERVIEW":
      return { label: "Second interview", tone: "neutral" };
    case "FINAL_INTERVIEW":
      return { label: "Final interview", tone: "neutral" };
    case "PLACED":
      return { label: "Placed", tone: "success" };
    case "SOURCED":
      return { label: "Identified", tone: "neutral" };
    case "LONGLISTED":
      return { label: "Longlisted", tone: "neutral" };
    case "QUALIFIED":
      return { label: "Qualified", tone: "neutral" };
    case "SUBMITTED":
      return { label: "Submitted", tone: "neutral" };
    case "CLIENT_REVIEW":
      return { label: "Awaiting client feedback", tone: "neutral" };
    case "OFFER":
      return { label: "Offer out", tone: "neutral" };
    case "ON_HOLD":
      return { label: "On hold", tone: "neutral" };
    case "REJECTED":
      return { label: "Rejected", tone: "neutral" };
    case "WITHDRAWN":
      return { label: "Withdrawn", tone: "neutral" };
  }
}

/** Fit (section 5): rating A/B/C → Strong/Good/Possible, display only. */
export function fitLabel(rating: CandidateRating): string | null {
  switch (rating) {
    case "A_STRONG":
      return "Strong";
    case "B_RELEVANT":
      return "Good";
    case "C_UNQUALIFIED":
      return "Possible";
    case "D_NOT_RELEVANT":
      return "Not relevant";
    case "NOT_RATED":
      return null;
  }
}

/** Stage-based next-step text used only when no open task is linked to the record. */
export function candidateNextStepFallback(stage: CandidateProcessStage, candidateFirstName: string): string | null {
  switch (stage) {
    case "CONTACT_REQUIRED":
      return `Call ${candidateFirstName} — first contact`;
    case "CONTACTED":
      return "Follow up on interest";
    case "CLIENT_REVIEW":
      return "Chase client for feedback";
    case "OFFER":
      return "Chase offer response";
    case "PLACED":
      return "Confirm start date";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Next action / status dot (opportunities, mandates, candidate processes)
// ---------------------------------------------------------------------------

export type DotTone = "danger" | "success" | "neutral";

/**
 * Red if the next open task is overdue, green if due today or later
 * (future-dated actions count as green), grey if there is no open task.
 */
export function statusDotTone(nextTaskDueDate: Date | null, now: Date = new Date()): DotTone {
  if (!nextTaskDueDate) return "neutral";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return nextTaskDueDate < startOfToday ? "danger" : "success";
}

/** Days at this stage = today minus the date of the latest stage change. */
export function daysAtStage(stageEnteredAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - stageEnteredAt.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

/** The six open-pipeline stages, in order; Won/Lost/On hold leave the board. */
export const OPEN_OPPORTUNITY_STAGES: OpportunityStage[] = [
  "SIGNAL_IDENTIFIED",
  "CONTACT_IDENTIFIED",
  "CONTACTED",
  "DISCOVERY_ARRANGED",
  "QUALIFIED",
  "PROPOSAL_OR_TERMS",
];

export function opportunityProbability(opportunity: {
  stage: OpportunityStage;
  probabilityOverride: number | null;
  isProbabilityOverridden: boolean;
}): number {
  return opportunity.isProbabilityOverridden
    ? (opportunity.probabilityOverride ?? 0)
    : (OPPORTUNITY_STAGE_PROBABILITY[opportunity.stage] ?? 0);
}

export function weightedOpportunityValue(opportunity: {
  stage: OpportunityStage;
  probabilityOverride: number | null;
  isProbabilityOverridden: boolean;
  estimatedFeeAmount: number | string | { toString(): string } | null;
}): number {
  const amount = opportunity.estimatedFeeAmount ? Number(opportunity.estimatedFeeAmount.toString()) : 0;
  return (amount * opportunityProbability(opportunity)) / 100;
}

/** Compact stage names for narrow widgets (overview, board headers); full names elsewhere use label(). */
export const OPPORTUNITY_STAGE_SHORT_LABEL: Partial<Record<OpportunityStage, string>> = {
  SIGNAL_IDENTIFIED: "Signal identified",
  CONTACT_IDENTIFIED: "Contact identified",
  CONTACTED: "Contacted",
  DISCOVERY_ARRANGED: "Discovery",
  QUALIFIED: "Qualified",
  PROPOSAL_OR_TERMS: "Proposal / Terms",
};

// ---------------------------------------------------------------------------
// Mandates
// ---------------------------------------------------------------------------

/** The six live-pipeline statuses, in order; Filled/Cancelled/On hold leave the board. */
export const LIVE_MANDATE_STATUSES = [
  "BRIEF_RECEIVED",
  "SEARCH_ACTIVE",
  "LONGLISTING",
  "SHORTLISTING",
  "INTERVIEWING",
  "OFFER",
] as const;

export const MANDATE_STAGE_AXIS_LABELS = ["Brief", "Search", "Long", "Short", "Int.", "Offer"];

export const MANDATE_STATUS_SHORT_LABEL: Record<(typeof LIVE_MANDATE_STATUSES)[number], string> = {
  BRIEF_RECEIVED: "Brief",
  SEARCH_ACTIVE: "Search",
  LONGLISTING: "Longlist",
  SHORTLISTING: "Shortlist",
  INTERVIEWING: "Interviews",
  OFFER: "Offer",
};

/** Position (0–100) of a live mandate's status along the Brief→Offer axis, for the range-dot. */
export function mandateStagePosition(status: (typeof LIVE_MANDATE_STATUSES)[number]): number {
  const index = LIVE_MANDATE_STATUSES.indexOf(status);
  if (index < 0) return 0;
  return (index / (LIVE_MANDATE_STATUSES.length - 1)) * 100;
}

/** Hold stage from acquisition date (organisation record / reports). */
export function holdStageFromAcquisitionDate(
  acquiredAt: Date,
  now: Date = new Date(),
): "NEWLY_ACQUIRED" | "EARLY_HOLD" | "MID_HOLD" | "LATE_HOLD" {
  const months = (now.getTime() - acquiredAt.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
  if (months < 12) return "NEWLY_ACQUIRED";
  if (months < 24) return "EARLY_HOLD";
  if (months < 48) return "MID_HOLD";
  return "LATE_HOLD";
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** A short, display-only form of an organisation's name (e.g. "Vantage Logistics Group" → "Vantage"). */
export function orgShortName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/** True if none of the given activity dates fall within the last `days` days. */
export function hasNoRecentActivity(activityDates: Date[], days: number, now: Date = new Date()): boolean {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return !activityDates.some((d) => d.getTime() >= cutoff);
}
