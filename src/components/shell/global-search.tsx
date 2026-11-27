"use client";

import { Sparkles } from "lucide-react";
import { useAskAtlas } from "./ask-atlas/ask-atlas-provider";

/**
 * Round 4 Part B "Ask AI bar replaces the search box at the top of the
 * sidebar": sparkle icon, "Ask AI" then muted "or search", light-blue AI
 * colours, no ⌘K badge on the bar itself (the tooltip still mentions it).
 * All of the actual panel logic now lives in AskAtlasProvider -- this is
 * just the trigger.
 */
export function GlobalSearch({ collapsed = false }: { collapsed?: boolean }) {
  const { open } = useAskAtlas();

  if (collapsed) {
    return (
      <button
        onClick={() => open()}
        aria-label="Ask AI or search (Cmd+K)"
        title="Ask AI or search (⌘K)"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-ai-line)] bg-[var(--color-ai-bg)] text-[var(--color-ai-icon)] transition-colors hover:opacity-90"
      >
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      aria-label="Ask AI or search (Cmd+K)"
      title="Ask AI or search (⌘K)"
      className="flex h-9 w-full items-center gap-2 rounded-md border border-[var(--color-ai-line)] bg-[var(--color-ai-bg)] px-2.5 text-[13px] transition-colors hover:opacity-90"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
      <span className="flex-1 truncate text-left">
        <span className="font-medium text-[var(--color-ink)]">Ask AI</span> <span className="text-[var(--color-ink-subtle)]">or search</span>
      </span>
    </button>
  );
}
