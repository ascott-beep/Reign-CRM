import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { ASK_ATLAS_TOOL_DEFINITIONS, runAskAtlasTool } from "@/lib/ask-atlas-tools";
import type { SessionUser } from "@/lib/permissions";

const MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `You are Ask Atlas, built into Atlas, a private-equity-focused executive search CRM. Answer the \
user's question using the search tools you're given — they are read-only and already scoped to this \
workspace and this user's permissions, so just call them with sensible arguments; you don't need to ask \
permission or explain that you're searching.

Use the web_search tool only for questions about the outside world (a company's ownership, news, market \
context) that Atlas's own data can't answer. If you use it, say so in your answer, e.g. "(found via web \
search)". Don't use it for anything Atlas's own tools can answer.

When you mention a specific person, organisation, opportunity or mandate that one of the search tools \
returned, write it as a token in this exact form: [[type:id:Label Text]] — e.g. [[person:ck1abc:Jane Doe]] \
or [[organization:ck2xyz:Oakfield Professional Services]]. Valid types: person, organization, opportunity, \
mandate. Use the id and a short label exactly as the tool gave them. Write this token in place of the name \
wherever it appears, not as a separate list.

You are read-only: you only answer questions, you never change any data. If asked to do something else \
(send an email, create a task, update a record), say that's not something you can do yet.

Be concise and direct. If nothing matches, say so plainly rather than guessing.`;

export type AskAtlasResult = { answer: string; usedWebSearch: boolean };

export async function askAtlas(user: SessionUser, question: string, recordContext?: string): Promise<AskAtlasResult> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { askAtlasEnabled: true } });
  if (!workspace.askAtlasEnabled) throw new Error("Ask Atlas is switched off for this workspace.");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — Ask Atlas is not configured yet.");

  const client = new Anthropic({ apiKey });
  const userPrompt = recordContext ? `${recordContext}\n\nQuestion: ${question}` : question;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  let usedWebSearch = false;
  let finalText = "";

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

      if (response.content.some((b) => b.type === "server_tool_use" && b.name === "web_search")) usedWebSearch = true;

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

  return { answer, usedWebSearch };
}
