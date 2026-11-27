"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Sparkles, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AnswerText } from "./answer-text";
import { askAtlasAction } from "./actions";

type OpenOptions = { question?: string; recordContext?: string; suggestedPrompts?: string[] };
type AskAtlasContextValue = { open: (opts?: OpenOptions) => void };

const AskAtlasContext = createContext<AskAtlasContextValue | null>(null);

export function useAskAtlas() {
  const ctx = useContext(AskAtlasContext);
  if (!ctx) throw new Error("useAskAtlas must be used within AskAtlasProvider");
  return ctx;
}

/** Round 2 section 8 — mounted once at the (app) layout so both the ⌘K search bar and any record's "Ask" button can open the same answer panel. */
export function AskAtlasProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [recordContext, setRecordContext] = useState<string | undefined>();
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [result, setResult] = useState<{ answer: string; usedWebSearch: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open(opts?: OpenOptions) {
    setQuestion(opts?.question ?? "");
    setRecordContext(opts?.recordContext);
    setSuggestedPrompts(opts?.suggestedPrompts ?? []);
    setResult(null);
    setError(null);
    setIsOpen(true);
    if (opts?.question) ask(opts.question, opts.recordContext);
  }

  function close() {
    setIsOpen(false);
  }

  function ask(q: string, context = recordContext) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await askAtlasAction(trimmed, context);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <AskAtlasContext.Provider value={{ open }}>
      {children}
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={close}>
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3.5 py-2.5">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-sm font-medium">Ask Atlas</span>
              <button onClick={close} className="ml-auto text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-3.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(question);
                }}
                className="flex flex-col gap-2"
              >
                <Textarea
                  autoFocus
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Which CFOs have we spoken to in logistics in the last 6 months?"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={pending || !question.trim()}>
                    {pending ? "Thinking…" : "Ask"}
                  </Button>
                </div>
              </form>

              {suggestedPrompts.length > 0 && !result && !pending ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setQuestion(p);
                        ask(p);
                      }}
                      className="rounded-[4px] bg-[var(--color-chip)] px-2.5 py-1 text-[12px] text-[var(--color-ink2)] hover:bg-[var(--color-chip-strong)]"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}

              {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}

              {result ? (
                <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3">
                  <AnswerText text={result.answer} />
                  {result.usedWebSearch ? (
                    <Badge tone="info" className="mt-2">
                      <Globe className="h-3 w-3" /> Used web search
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AskAtlasContext.Provider>
  );
}
