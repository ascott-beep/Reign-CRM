import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5-5";

export type OrganizationResearchFields = {
  website?: string;
  hqCity?: string;
  hqCountryCode?: string;
  aumAmount?: number;
  aumCurrency?: string;
  sectors?: string[];
  about?: string;
};

export type OrganizationResearchResult = {
  fields: OrganizationResearchFields;
  sources: { title: string; url: string }[];
};

const SYSTEM_PROMPT = `You research a company from public web sources for a private-equity-focused executive \
search CRM, filling in a new organisation record. Use the web_search tool to find the company's own site, \
press coverage, and profile sites (PitchBook, Companies House, LinkedIn). Reply with a single JSON object, \
nothing else, matching this shape exactly (omit a key if you cannot find it, never guess):

{"website": "https://...", "hqCity": "City", "hqCountryCode": "GB", "aumAmount": 500000000, "aumCurrency": \
"GBP", "sectors": ["Healthcare", "Software"], "about": "One or two plain sentences describing the company."}

aumAmount is a plain number with no currency symbol or separators. hqCountryCode is a 2-letter ISO code. \
sectors is a short list of 1 to 4 plain sector names. Only include aumAmount/aumCurrency for an investment \
firm, not an operating company. Output only the JSON object, no other text.`;

/** Round 4 screen 27 "New organisation, filled by AI" -- a different job from the Intelligence research agent (which finds news signals, not profile fields). */
export async function researchNewOrganization(name: string): Promise<OrganizationResearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Research needs the AI connection set up first. An admin can add it in Settings.");

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `Research the company "${name}".` }];
  const sources: { title: string; url: string }[] = [];
  let finalText = "";

  for (let turn = 0; turn < 4; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      messages,
    });

    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const page of block.content) {
          if (page.type === "web_search_result") sources.push({ title: page.title, url: page.url });
        }
      }
    }

    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    if (response.stop_reason !== "tool_use") break;
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: "Continue, then reply with the final JSON object only." });
  }

  const match = finalText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not read a result from the research, try again.");

  let fields: OrganizationResearchFields;
  try {
    fields = JSON.parse(match[0]);
  } catch {
    throw new Error("Could not read a result from the research, try again.");
  }

  return { fields, sources: sources.slice(0, 5) };
}
