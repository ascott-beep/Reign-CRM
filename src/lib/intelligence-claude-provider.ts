import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { IntelligenceProvider, ResearchResult, ResearchInput, ResearchSignal } from "./intelligence-provider";

const MODEL = "claude-sonnet-5-5";

// Roughly what this model + web search costs per run, for the cost log
// (section 5 "Log every run, its sources and its cost") — exact figures
// depend on Anthropic's published pricing; update here if it changes.
const INPUT_PER_MTOK = 3;
const OUTPUT_PER_MTOK = 15;
const WEB_SEARCH_PER_1000 = 10;

const SIGNAL_TYPES = [
  "LEADERSHIP_CHANGE",
  "POTENTIAL_VACANCY",
  "ACTIVE_VACANCY",
  "ACQUISITION",
  "INTEGRATION",
  "CARVE_OUT",
  "TRANSFORMATION",
  "INTERNATIONAL_EXPANSION",
  "EXIT_PREPARATION",
  "REFINANCING",
  "FINANCE_TEAM_WEAKNESS",
  "FAILED_SEARCH",
  "AGENCY_DISSATISFACTION",
  "CANDIDATE_MOVEMENT",
  "OTHER",
] as const;

const SYSTEM_PROMPT = `You are a research analyst for Atlas, a private-equity-focused executive search CRM. \
For the company you're given, use web search to review news, press releases, the company's own website, \
PE fund announcements, deal sites, job postings (e.g. "hiring a CFO") and public filings found on the web. \
Read the actual sources, not just headlines or snippets.

Only report events that matter to an executive search firm: finance leadership changes, fundraises, \
acquisitions, exits, new PE ownership, restructuring, finance job postings, and clear growth or distress \
signals. Ignore routine news, marketing content and anything not about this specific company.

If the same story appears in several sources, merge it into one signal with every source link, rather than \
reporting it more than once.

Respond with nothing but a JSON array (no prose, no markdown fence) of signals, each shaped exactly like:
{"type": one of ${SIGNAL_TYPES.join(" | ")}, "summary": "one line, plain English", \
"confidence": "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED", \
"sources": [{"url": "...", "title": "..."}], "mentionedPersonName": "optional, a named person", \
"likelyRole": "optional, e.g. CFO"}
Return an empty array if nothing relevant was found.`;

function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toSignal(raw: unknown): ResearchSignal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = typeof r.type === "string" && (SIGNAL_TYPES as readonly string[]).includes(r.type) ? (r.type as ResearchSignal["type"]) : "OTHER";
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  if (!summary) return null;
  const confidence =
    r.confidence === "VERIFIED" || r.confidence === "PARTIALLY_VERIFIED" || r.confidence === "UNVERIFIED" ? r.confidence : "UNVERIFIED";
  const sources = Array.isArray(r.sources)
    ? r.sources
        .filter((s): s is { url: string; title?: string } => Boolean(s) && typeof (s as { url?: unknown }).url === "string")
        .map((s) => ({ url: s.url, title: typeof s.title === "string" ? s.title : undefined }))
    : [];
  return {
    type,
    summary,
    confidence: confidence as ResearchSignal["confidence"],
    sources,
    mentionedPersonName: typeof r.mentionedPersonName === "string" ? r.mentionedPersonName : undefined,
    likelyRole: typeof r.likelyRole === "string" ? r.likelyRole : undefined,
  };
}

/** Round 2 section 5 — the Claude-API-backed research provider; see lib/intelligence-provider.ts for the interface Grok would implement alongside this. */
export class ClaudeIntelligenceProvider implements IntelligenceProvider {
  readonly name = "claude";

  async research({ companyName, website, context }: ResearchInput): Promise<ResearchResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — the research agent is not configured yet.");

    const client = new Anthropic({ apiKey });
    const userPrompt = [
      `Research "${companyName}"${website ? ` (${website})` : ""} and report any signals from the last 90 days.`,
      context ? `Notes from past reviews — use these to judge what's relevant:\n${context}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const signals = extractJsonArray(text)
      .map(toSignal)
      .filter((s): s is ResearchSignal => s !== null);

    const webSearchUses = message.content.filter((b) => b.type === "server_tool_use" && b.name === "web_search").length;
    const inputTokens = message.usage?.input_tokens ?? 0;
    const outputTokens = message.usage?.output_tokens ?? 0;
    const costUsd = (inputTokens / 1_000_000) * INPUT_PER_MTOK + (outputTokens / 1_000_000) * OUTPUT_PER_MTOK + (webSearchUses / 1000) * WEB_SEARCH_PER_1000;

    return { signals, costUsd };
  }
}
