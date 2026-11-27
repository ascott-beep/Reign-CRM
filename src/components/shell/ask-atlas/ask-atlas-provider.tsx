"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { askAtlasAction } from "./actions";
import { AskAiEmptyView } from "./ask-ai-empty-view";
import { AskAiResultsView } from "./ask-ai-results-view";
import { AskAiAnswerView } from "./ask-ai-answer-view";
import { getRecentRecords } from "@/lib/recent-records";
import type { AskAtlasResult } from "@/lib/ask-atlas";
import type { SuggestedQuestion } from "@/lib/ask-ai-suggestions";
import type { PanelRow, SearchGroup } from "./types";

type OpenOptions = { question?: string; recordContext?: string; suggestedPrompts?: string[] };
type ConversationTurn = { question: string; result: AskAtlasResult };
type View = "empty" | "results" | "answer";

const AskAtlasContext = createContext<{ open: (opts?: OpenOptions) => void } | null>(null);

export function useAskAtlas() {
  const ctx = useContext(AskAtlasContext);
  if (!ctx) throw new Error("useAskAtlas must be used within AskAtlasProvider");
  return ctx;
}

/**
 * Round 4 ground rule: a record's own "Ask" button (opportunity/mandate
 * header, person/organisation AskAtlasButton) passes a recordContext
 * sentence like `The user is viewing the opportunity "X" in Atlas.` --
 * turned into 4 record-flavoured suggested questions for this same panel's
 * empty state, rather than the generic workspace-wide ones. The dedicated
 * 440px record side panel (screen 18) is Section 4 scope, not this one.
 */
function recordContextQuestions(recordContext: string): SuggestedQuestion[] {
  const match = recordContext.match(/viewing the (\w+) "([^"]+)"/);
  const kind = match?.[1] ?? "";
  const name = match?.[2] ?? "this record";
  const tag = ({ opportunity: "Opportunity", mandate: "Mandate", person: "Person", company: "Organisation" } as Record<string, string>)[kind] ?? "Record";
  return [
    { text: `Summarise ${name}`, tag },
    { text: `What's the latest on ${name}`, tag },
    { text: "Who could fit this role", tag: "People" },
    { text: `What should happen next for ${name}`, tag },
  ];
}

export function AskAtlasProvider({ children, suggestedQuestions }: { children: React.ReactNode; suggestedQuestions: SuggestedQuestion[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [contextQuestions, setContextQuestions] = useState<SuggestedQuestion[] | null>(null);
  const [recordContext, setRecordContext] = useState<string | undefined>();
  const [recent, setRecent] = useState<ReturnType<typeof getRecentRecords>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const view: View = turns.length > 0 || asking || askError ? "answer" : query.trim().length >= 2 ? "results" : "empty";

  const ask = useCallback(async (q: string, context: string | undefined, priorTurns: ConversationTurn[]) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAsking(true);
    setAskError(null);
    try {
      const history = priorTurns.map((t) => ({ question: t.question, answer: t.result.answer }));
      const result = await askAtlasAction(trimmed, context, history);
      setTurns((prev) => [...prev, { question: trimmed, result }]);
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }, []);

  const openPanel = useCallback((opts?: OpenOptions) => {
    setQuery("");
    setGroups([]);
    setTurns([]);
    setAskError(null);
    setTypeFilter(null);
    setActiveIndex(0);
    setFollowUp("");
    setRecordContext(opts?.recordContext);
    setContextQuestions(opts?.recordContext ? recordContextQuestions(opts.recordContext) : null);
    setRecent(getRecentRecords(3));
    setOpen(true);
    if (opts?.question) ask(opts.question, opts.recordContext, []);
  }, [ask]);

  function closePanel() {
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) closePanel();
        else openPanel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, openPanel]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setGroups(data.groups ?? []))
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 200);
  }

  function go(href: string) {
    closePanel();
    router.push(href);
  }

  // Build the flat, keyboard-navigable row list for whichever view is current.
  const rows: PanelRow[] = useMemo(() => {
    if (view === "empty") {
      const questionRows: PanelRow[] = (contextQuestions ?? suggestedQuestions).map((q) => ({ kind: "question", text: q.text, tag: q.tag }));
      const recentRows: PanelRow[] = recent.map((r) => ({ kind: "recent", id: r.id, label: r.label, meta: r.meta, href: r.href, recordType: r.type }));
      return [...questionRows, ...recentRows];
    }
    if (view === "results") {
      const visibleGroups = typeFilter ? groups.filter((g) => g.type === typeFilter) : groups;
      const resultRows: PanelRow[] = visibleGroups.flatMap((g) => g.items.map((item): PanelRow => ({ kind: "result", groupLabel: g.label, item })));
      return [{ kind: "ask-ai", query: query.trim() }, ...resultRows];
    }
    return [];
  }, [view, contextQuestions, suggestedQuestions, recent, typeFilter, groups, query]);

  function activateRow(row: PanelRow) {
    if (row.kind === "question") {
      ask(row.text, recordContext, turns);
    } else if (row.kind === "ask-ai") {
      ask(row.query, recordContext, turns);
    } else if (row.kind === "recent" || row.kind === "result") {
      go(row.kind === "recent" ? row.href : row.item.href);
    }
  }

  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
      return;
    }
    if (view === "answer") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) activateRow(row);
    } else if (e.key === "Tab" && view === "results") {
      e.preventDefault();
      const types = groups.map((g) => g.type);
      if (types.length === 0) return;
      const currentIdx = typeFilter ? types.indexOf(typeFilter) : -1;
      const next = currentIdx + 1 >= types.length ? null : types[currentIdx + 1]!;
      setTypeFilter(next);
      setActiveIndex(0);
    }
  }

  function submitFollowUp() {
    const trimmed = followUp.trim();
    if (!trimmed) return;
    setFollowUp("");
    ask(trimmed, recordContext, turns);
  }

  function copyAnswer() {
    const last = turns[turns.length - 1];
    if (last) navigator.clipboard?.writeText(last.result.answer).catch(() => {});
  }

  const lastTurn = turns[turns.length - 1] ?? null;
  const headerText = view === "answer" ? (lastTurn?.question ?? "") : query;

  return (
    <AskAtlasContext.Provider value={{ open: openPanel }}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pl-[228px] pt-[88px]" onClick={closePanel}>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onPanelKeyDown}
            className="flex w-full max-w-[680px] flex-col overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-4 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
              {view === "answer" ? (
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[var(--color-ink)]">{headerText}</span>
              ) : (
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Ask AI or search people, companies and searches"
                  className="h-7 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--color-ink-subtle)]"
                />
              )}
              <span className="shrink-0 rounded-[4px] border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-subtle)]">esc</span>
            </div>

            {view === "empty" ? (
              <AskAiEmptyView rows={rows} activeIndex={activeIndex} onHover={setActiveIndex} onActivate={activateRow} />
            ) : view === "results" ? (
              <AskAiResultsView
                query={query.trim()}
                groups={groups}
                loading={searchLoading}
                typeFilter={typeFilter}
                rows={rows}
                activeIndex={activeIndex}
                onHover={setActiveIndex}
                onActivate={activateRow}
              />
            ) : (
              <AskAiAnswerView
                result={lastTurn?.result ?? null}
                asking={asking}
                error={askError}
                followUp={followUp}
                onFollowUpChange={setFollowUp}
                onSubmitFollowUp={submitFollowUp}
                onCopy={copyAnswer}
              />
            )}

            {view !== "answer" ? (
              <div className="flex items-center gap-4 border-t border-[var(--color-line)] px-3.5 py-2 text-[11.5px] text-[var(--color-ink-subtle)]">
                <span>↵ {view === "empty" ? "Ask" : "Open"}</span>
                <span>↑↓ Move</span>
                {view === "results" ? <span>tab Filter by type</span> : null}
                <span className="ml-auto">esc Close</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AskAtlasContext.Provider>
  );
}
