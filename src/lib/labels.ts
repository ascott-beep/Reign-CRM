import { humanizeEnum } from "@/lib/utils";

/**
 * Central label overrides for enum values that shouldn't just be
 * title-cased (acronyms, ratings with descriptive suffixes, etc).
 * Anything not listed here falls back to humanizeEnum().
 */
const OVERRIDES: Record<string, string> = {
  // UserRole
  ADMIN: "Administrator",
  STANDARD: "Standard User",
  READ_ONLY: "Read Only",

  // OrganizationType
  PE_FUND: "PE Fund",

  // CandidateRating
  A_STRONG: "A — Strong",
  B_RELEVANT: "B — Relevant",
  C_UNQUALIFIED: "C — Unqualified",
  D_NOT_RELEVANT: "D — Not Relevant",
  NOT_RATED: "Not Rated",

  // Seniority
  BOARD_OR_C_SUITE: "Board / C-Suite",
  N_MINUS_1: "N-1 (Direct Report to C-Suite)",
  DIRECTOR_OR_VP: "Director / VP",
  CONSULTANT_OR_INTERIM: "Consultant / Interim",

  // StakeholderRole
  PROCUREMENT_OR_TERMS: "Procurement / Terms",
  HR: "HR",

  // PersonType
  TALENT_OR_HR: "Talent / HR",

  // Opportunity stages
  SIGNAL_IDENTIFIED: "Signal Identified",
  PROPOSAL_OR_TERMS: "Proposal / Terms",

  // Fee / engagement
  PERCENTAGE_OF_BASE: "% of Base Salary",
  PERCENTAGE_OF_TOTAL_CASH: "% of Total Cash",
  DAY_RATE_MARGIN: "Day Rate Margin",

  // Off-limits / confidentiality
  DO_NOT_CONTACT: "Do Not Contact",

  // Placement status
  PLANNED_START: "Planned Start",
  GUARANTEE_COMPLETE: "Guarantee Complete",
  LEFT_IN_GUARANTEE: "Left During Guarantee",
  FELL_THROUGH: "Fell Through",

  // Investment stage
  NEWLY_ACQUIRED: "Newly Acquired (< 12 months)",
  EARLY_HOLD: "Early Hold (12–24 months)",
  MID_HOLD: "Mid Hold (25–48 months)",
  LATE_HOLD: "Late Hold (> 48 months)",
  EXIT_ANNOUNCED: "Exit Announced",

  // Off-limits
  ACTIVE_CLIENT: "Active Client",
  PLACEMENT_GUARANTEE: "Placement Guarantee",
  MANDATE_SPECIFIC: "Mandate-Specific",
  INTERNAL_DECISION: "Internal Decision",

  CV: "CV",
  JOB_DESCRIPTION: "Job Description",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return OVERRIDES[value] ?? humanizeEnum(value);
}

export const OPPORTUNITY_STAGE_PROBABILITY: Record<string, number> = {
  SIGNAL_IDENTIFIED: 5,
  CONTACT_IDENTIFIED: 10,
  CONTACTED: 15,
  DISCOVERY_ARRANGED: 25,
  QUALIFIED: 40,
  PROPOSAL_OR_TERMS: 65,
  WON: 100,
  LOST: 0,
  ON_HOLD: 0,
};

export const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  ACTIVE_CLIENT: "success",
  ACTIVE_RELATIONSHIP: "success",
  WON: "success",
  FILLED: "success",
  PLACED: "success",
  QUALIFIED: "success",
  DO_NOT_CONTACT: "danger",
  ARCHIVED: "neutral",
  LOST: "danger",
  CANCELLED: "danger",
  REJECTED: "danger",
  WITHDRAWN: "danger",
  DORMANT: "neutral",
  ON_HOLD: "warning",
  PROSPECT: "info",
  TARGET: "info",
  RESEARCH: "neutral",
  RESEARCH_ONLY: "neutral",
};

export function statusTone(value: string | null | undefined) {
  if (!value) return "neutral" as const;
  return STATUS_TONE[value] ?? ("neutral" as const);
}
