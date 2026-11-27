import "server-only";
import type { IntelligenceType, IntelligenceConfidence } from "@prisma/client";

/** Round 2 section 5 — one signal the research agent found, before it's written to the database. */
export type ResearchSignal = {
  type: IntelligenceType;
  summary: string;
  confidence: IntelligenceConfidence;
  sources: { url: string; title?: string }[];
  /** Free-text name of a person mentioned in the signal, if any — matched against Atlas people by name at write time. */
  mentionedPersonName?: string;
  /** e.g. "CFO" — used to pre-fill "Accept & create opportunity"'s role field. */
  likelyRole?: string;
};

export type ResearchResult = {
  signals: ResearchSignal[];
  costUsd?: number;
};

export type ResearchInput = {
  companyName: string;
  website?: string | null;
  /** Extra context to steer the agent, e.g. accumulated dismiss reasons so it learns what to skip. */
  context?: string;
};

/**
 * Round 2 section 5 "Provider interface: build research behind an interface
 * so Grok (xAI API) can be added later as a second provider without
 * changing anything else." Only a Claude implementation exists today
 * (lib/intelligence-claude-provider.ts) — a GrokIntelligenceProvider
 * implementing this same interface is all a second provider would need.
 */
export interface IntelligenceProvider {
  readonly name: string;
  research(input: ResearchInput): Promise<ResearchResult>;
}
