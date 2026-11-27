import Link from "next/link";
import { Sparkles, Copy, Building2, Briefcase, TrendingUp, User } from "lucide-react";
import { Skeleton } from "@/components/shell/states";
import { AnswerText } from "./answer-text";
import type { AskAtlasResult } from "@/lib/ask-atlas";

const RECORD_ICON = { person: User, organization: Building2, opportunity: TrendingUp, mandate: Briefcase } as const;

/** Round 4 screen 02 (R4AskAnswer): the answer, supporting records, sources line, follow-up box and disclaimer. */
export function AskAiAnswerView({
  result,
  asking,
  error,
  followUp,
  onFollowUpChange,
  onSubmitFollowUp,
  onCopy,
}: {
  result: AskAtlasResult | null;
  asking: boolean;
  error: string | null;
  followUp: string;
  onFollowUpChange: (v: string) => void;
  onSubmitFollowUp: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="flex max-h-[520px] flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {asking && !result ? (
          <Skeleton lines={3} />
        ) : error ? (
          <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p>
        ) : result ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-subtle)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-ai-icon)]" /> AI answer · from your Atlas data
            </p>
            <AnswerText text={result.answer} />

            {result.recordRefs.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1 rounded-[6px] border border-[var(--color-line)]">
                {result.recordRefs.map((ref) => {
                  const Icon = RECORD_ICON[ref.type];
                  return (
                    <Link
                      key={`${ref.type}-${ref.id}`}
                      href={ref.href}
                      className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-3 py-2 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[var(--color-ink)]">{ref.label}</span>
                        {ref.meta ? <span className="block truncate text-xs text-[var(--color-ink-subtle)]">{ref.meta}</span> : null}
                      </span>
                      {ref.tag ? <span className="shrink-0 rounded-[4px] bg-[var(--color-chip)] px-2 py-0.5 text-[11px] text-[var(--color-ink-subtle)]">{ref.tag}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {result.sources.length > 0 || result.webPages.length > 0 ? (
              <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
                Sources:{" "}
                {result.sources.map((s, i) => (
                  <span key={s.label}>
                    {i > 0 ? " · " : ""}
                    {s.count} {s.label}
                  </span>
                ))}
                {result.webPages.length > 0 ? (
                  <>
                    {result.sources.length > 0 ? " · " : ""}
                    and{" "}
                    <Link href={result.webPages[0]!.url} target="_blank" rel="noreferrer" className="underline">
                      {result.webPages.length} web page{result.webPages.length === 1 ? "" : "s"}
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="border-t border-[var(--color-line)] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitFollowUp();
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={followUp}
            onChange={(e) => onFollowUpChange(e.target.value)}
            placeholder="Ask a follow-up"
            disabled={asking}
            className="h-10 flex-1 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm outline-none placeholder:text-[var(--color-ink-subtle)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onCopy}
            disabled={!result}
            aria-label="Copy answer"
            title="Copy answer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-[11.5px] text-[var(--color-ink-subtle)]">AI can make mistakes. Check the records before you act.</p>
      </div>
    </div>
  );
}
