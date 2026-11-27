import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { ASK_ATLAS_TOOL_DEFINITIONS, runAskAtlasTool, summariseRecordRefs, type RecordRefSummary } from "@/lib/ask-atlas-tools";
import { extractRecordTokens } from "@/lib/ask-atlas-tokens";
import type { SessionUser } from "@/lib/permissions";

/** Round 4 screen 02 "Sources: ... 3 candidate records, 2 interview notes" -- a plain-English label per tool, used to summarise what Ask Atlas read. */
const TOOL_SOURCE_LABEL: Record<string, string> = {
  search_people: "person record",
  search_organizations: "organisation record",
  search_opportunities: "opportunity record",
  search_mandates: "mandate record",
  search_candidate_processes: "candidate record",
  search_activities_notes: "interview note",
};

export type AskAtlasSource = { label: string; count: number };
export type AskAtlasWebPage = { title: string; url: string };

const MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `You are Ask Atlas, built into Atlas, a private-equity-focused executive search CRM. Answer the \
user's question using the search tools you're given, they are read-only and already scoped to this \
workspace and this user's permissions, so just call them with sensible arguments; you don't need to ask \
permission or explain that you're searching.

Use the web_search tool only for questions about the outside world (a company's ownership, news, market \
context) that Atlas's own data can't answer. If you use it, say so in your answer, e.g. "(found via web \
search)". Don't use it for anything Atlas's own tools can answer.

When you mention a specific person, organisation, opportunity or mandate that one of the search tools \
returned, write it as a token in this exact form: [[type:id:Label Text]], e.g. [[person:ck1abc:Jane Doe]] \
or [[organization:ck2xyz:Oakfield Professional Services]]. Valid types: person, organization, opportunity, \
mandate. Use the id and a short label exactly as the tool gave them. Write this token in place of the name \
wherever it appears, not as a separate list.

You are read-only: you only answer questions, you never change any data. If asked to do something else \
(send an email, create a task, update a record), say that's not something you can do yet.

Be concise and direct. If nothing matches, say so plainly rather than guessing.`;

export type AskAtlasResult = {
  answer: string;
  usedWebSearch: boolean;
  recordRefs: RecordRefSummary[];
  sources: AskAtlasSource[];
  webPages: AskAtlasWebPage[];
};

/**
 * `history` carries prior turns of the same conversation (Round 4 screen 02's
 * "Ask a follow-up" box) -- askAtlas itself is stateless per call, so the
 * caller (the Ask AI panel) is the one holding the running conversation and
 * replays it here each time.
 */
export async function askAtlas(
  user: SessionUser,
  question: string,
  recordContext?: string,
  history?: { question: string; answer: string }[],
): Promise<AskAtlasResult> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { askAtlasEnabled: true } });
  if (!workspace.askAtlasEnabled) throw new Error("Ask Atlas is switched off for this workspace.");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set, Ask Atlas is not configured yet.");

  const client = new Anthropic({ apiKey });
  const userPrompt = recordContext ? `${recordContext}\n\nQuestion: ${question}` : question;

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).flatMap((turn): Anthropic.MessageParam[] => [
      { role: "user", content: turn.question },
      { role: "assistant", content: turn.answer },
    ]),
    { role: "user", content: userPrompt },
  ];
  let usedWebSearch = false;
  let finalText = "";
  const toolCallCounts = new Map<string, number>();
  const webPages: AskAtlasWebPage[] = [];

  // Section 8 "Log every question" — logged whether this turns out to succeed or fail, so admins can see what's being asked either way.
  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [...ASK_ATLAS_TOOL_DEFINITIONS, { type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages,
      });

      for (const block of response.content) {
        if (block.type === "server_tool_use" && block.name === "web_search") usedWebSearch = true;
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const page of block.content) {
            if (page.type === "web_search_result") webPages.push({ title: page.title, url: page.url });
          }
        }
      }

      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") break;

      messages.push({ role: "assistant", content: response.content });
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await runAskAtlasTool(block.name, block.input as Record<string, unknown>, user).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
          if (Array.isArray(result) && TOOL_SOURCE_LABEL[block.name]) {
            toolCallCounts.set(block.name, (toolCallCounts.get(block.name) ?? 0) + result.length);
          }
          return { type: "tool_result" as const, tool_use_id: block.id, content: JSON.stringify(result) };
        }),
      );
      messages.push({ role: "user", content: toolResults });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.askAtlasQuery.create({ data: { workspaceId: user.workspaceId, userId: user.id, question, answer: `[failed] ${message}`, usedWebSearch } });
    throw error;
  }

  const answer = finalText.trim() || "I couldn't find an answer.";

  await prisma.askAtlasQuery.create({
    data: { workspaceId: user.workspaceId, userId: user.id, question, answer, usedWebSearch },
  });

  const sources: AskAtlasSource[] = [...toolCallCounts.entries()]
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ label: `${TOOL_SOURCE_LABEL[name]}${count === 1 ? "" : "s"}`, count }));

  const recordRefs = await summariseRecordRefs(user, extractRecordTokens(answer));

  return { answer, usedWebSearch, recordRefs, sources, webPages };
}
