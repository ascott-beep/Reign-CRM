"use server";

import { requireUser } from "@/lib/permissions";
import { askAtlas } from "@/lib/ask-atlas";

export async function askAtlasAction(question: string, recordContext?: string, history?: { question: string; answer: string }[]) {
  const user = await requireUser();
  const trimmed = question.trim();
  if (!trimmed) throw new Error("Ask a question first.");
  return askAtlas(user, trimmed, recordContext, history);
}
