/**
 * Shared business rules (SPEC.md section 5). The board, lists, overview and
 * reports all read from here so they agree on wording and numbers.
 */
import type { CandidateProcessStage, CandidateRating, IntelligenceType, MandateStatus, OpportunityStage } from "@prisma/client";
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

/**
 * One-line candidate summary for a mandate's list row, e.g.
 * "1 placed, 1 at final interview" — most-advanced groups first, hidden
 * (rejected/withdrawn/on hold) candidates excluded.
 */
export function summariseCandidateProcesses(stages: CandidateProcessStage[]): string {
  const visible = stages.filter((s) => !isCandidateHidden(s));
  if (visible.length === 0) return "No active candidates";
  const counts = new Map<string, { label: string; step: number; count: number }>();
  for (const stage of visible) {
    const step = candidateStep(stage);
    if (!step) continue;
    const key = candidatePlainStatus(stage).label;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label: key, step: step.step, count: 1 });
  }
  const groups = [...counts.values()].sort((a, b) => b.step - a.step);
  return groups
    .slice(0, 2)
    .map((g) => `${g.count} ${g.label.toLowerCase()}`)
    .join(", ");
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

/**
 * Stage-based next-step text used only when no open task is linked to the
 * record. Section 5 spells out Contact required / Contacted / Client review /
 * Offer / Placed; the reference screens (04-mandate-record) show text for
 * every other stage too (Nisha Patel at Identified → "Decide whether to
 * longlist", Michael Tan at Final interview → "Chase client for feedback"),
 * so the remaining stages follow that same pattern — CLAUDE.md has the
 * reference HTML take precedence over the written table where they differ.
 */
export function candidateNextStepFallback(stage: CandidateProcessStage, candidateFirstName: string): string | null {
  switch (stage) {
    case "SOURCED":
      return "Decide whether to longlist";
    case "LONGLISTED":
      return "Decide whether to approach";
    case "CONTACT_REQUIRED":
      return `Call ${candidateFirstName} — first contact`;
    case "CONTACTED":
      return "Follow up on interest";
    case "INTERESTED":
      return "Move forward with qualifying";
    case "QUALIFIED":
      return "Submit to client";
    case "SUBMITTED":
      return "Chase client for feedback";
    case "CLIENT_REVIEW":
      return "Chase client for feedback";
    case "FIRST_INTERVIEW":
    case "FURTHER_INTERVIEW":
    case "FINAL_INTERVIEW":
      return "Chase client for feedback";
    case "OFFER":
      return "Chase offer response";
    case "PLACED":
      return "Confirm start date";
    default:
      return null;
  }
}

/** True when the stage-based fallback next step (no linked task) is itself something to chase, shown in --warn. */
export function candidateNextStepFallbackUrgent(stage: CandidateProcessStage): boolean {
  return ["CONTACT_REQUIRED", "SUBMITTED", "CLIENT_REVIEW", "FIRST_INTERVIEW", "FURTHER_INTERVIEW", "FINAL_INTERVIEW"].includes(stage);
}

// ---------------------------------------------------------------------------
// Next action / status dot (opportunities, mandates, candidate processes)
// ---------------------------------------------------------------------------
//
// The dot itself lives in components/ui/next-action-dot.tsx and
// lib/next-action-status.ts (built in Phase 1) — use nextActionStatus()
// from there for status-dot tone, not a second copy of this rule here.

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

/** Closed stages leave the board for the Closed tray (section 4.2). */
export const CLOSED_OPPORTUNITY_STAGES: OpportunityStage[] = ["WON", "LOST", "ON_HOLD"];

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

/** Closed statuses leave the board for the Closed tray (section 4.3). */
export const CLOSED_MANDATE_STATUSES: MandateStatus[] = ["FILLED", "CANCELLED", "ON_HOLD"];

/** The stage bar on a mandate record: 7 steps, Brief through Filled (section 3 "Stage bar"). */
export const MANDATE_STAGE_BAR_STEPS = [
  "BRIEF_RECEIVED",
  "SEARCH_ACTIVE",
  "LONGLISTING",
  "SHORTLISTING",
  "INTERVIEWING",
  "OFFER",
  "FILLED",
] as const satisfies readonly MandateStatus[];

export const MANDATE_STAGE_BAR_LABELS: Record<(typeof MANDATE_STAGE_BAR_STEPS)[number], string> = {
  BRIEF_RECEIVED: "Brief",
  SEARCH_ACTIVE: "Searching",
  LONGLISTING: "Longlist",
  SHORTLISTING: "Shortlist",
  INTERVIEWING: "Interviews",
  OFFER: "Offer",
  FILLED: "Filled",
};

/** Step number (1–7) for a mandate's status on the record page's stage bar. On hold/Cancelled show at their last active step. */
export function mandateStageBarStep(status: MandateStatus): number {
  const index = (MANDATE_STAGE_BAR_STEPS as readonly MandateStatus[]).indexOf(status);
  return index >= 0 ? index + 1 : 1;
}

export type MandateFlowTab = "brief" | "candidates" | "interviews" | "offer";

/** Section 5 "Mandate flow": the record opens on the tab for its current stage. */
export function mandateFlowTab(status: MandateStatus): MandateFlowTab {
  switch (status) {
    case "BRIEF_RECEIVED":
      return "brief";
    case "SEARCH_ACTIVE":
    case "LONGLISTING":
    case "SHORTLISTING":
      return "candidates";
    case "INTERVIEWING":
      return "interviews";
    case "OFFER":
    case "FILLED":
      return "offer";
    default:
      return "candidates";
  }
}

export type MandateBanner = {
  key: "placed_not_filled" | "offer_before_mandate_offer" | "filled_nobody_placed";
  message: string;
  candidateProcessId?: string;
};

/**
 * Consistency checks (section 5) shown as a banner on the mandate record.
 * Checked in order; the first that applies is shown.
 */
export function mandateConsistencyCheck(
  mandate: { status: MandateStatus },
  candidateProcesses: { id: string; stage: CandidateProcessStage; candidateFirstName: string; candidateLastName: string }[],
): MandateBanner | null {
  const placed = candidateProcesses.find((p) => p.stage === "PLACED");
  if (placed && mandate.status !== "FILLED") {
    return {
      key: "placed_not_filled",
      message: `${placed.candidateFirstName} ${placed.candidateLastName} has been placed, so this search may be finished.`,
      candidateProcessId: placed.id,
    };
  }

  const mandateStepIndex = (MANDATE_STAGE_BAR_STEPS as readonly MandateStatus[]).indexOf(mandate.status);
  const offerStepIndex = MANDATE_STAGE_BAR_STEPS.indexOf("OFFER");
  const atOffer = candidateProcesses.find((p) => p.stage === "OFFER");
  if (atOffer && mandateStepIndex >= 0 && mandateStepIndex < offerStepIndex) {
    return {
      key: "offer_before_mandate_offer",
      message: `${atOffer.candidateFirstName} ${atOffer.candidateLastName} is at Offer, but this search isn't at Offer yet.`,
      candidateProcessId: atOffer.id,
    };
  }

  if (mandate.status === "FILLED" && !placed) {
    return { key: "filled_nobody_placed", message: "This mandate is marked Filled, but nobody has been recorded as placed." };
  }

  return null;
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

// ---------------------------------------------------------------------------
// Intelligence
// ---------------------------------------------------------------------------

/** Compact chip label for Market signals (overview) — the full label() wording is too long to fit on one line. */
export const INTELLIGENCE_TYPE_SHORT_LABEL: Record<IntelligenceType, string> = {
  LEADERSHIP_CHANGE: "Leadership",
  POTENTIAL_VACANCY: "Potential role",
  ACTIVE_VACANCY: "Active role",
  ACQUISITION: "Acquisition",
  INTEGRATION: "Integration",
  CARVE_OUT: "Carve-out",
  TRANSFORMATION: "Transformation",
  INTERNATIONAL_EXPANSION: "Expansion",
  EXIT_PREPARATION: "Exit prep",
  REFINANCING: "Refinancing",
  FINANCE_TEAM_WEAKNESS: "Finance team",
  FAILED_SEARCH: "Failed search",
  AGENCY_DISSATISFACTION: "Agency issue",
  CANDIDATE_MOVEMENT: "Candidate move",
  OTHER: "Other",
};
