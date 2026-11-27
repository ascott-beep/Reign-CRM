import { Sparkles, Building2, Briefcase, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentRecord } from "@/lib/recent-records";
import type { PanelRow } from "./types";

const RECORD_ICON = { person: User, organization: Building2, opportunity: TrendingUp, mandate: Briefcase } as const;

/** Round 4 screen 01 (R4AskOpen) empty state: 4 suggested questions, then up to 3 recently viewed records. */
export function AskAiEmptyView({
  rows,
  activeIndex,
  onHover,
  onActivate,
}: {
  rows: PanelRow[];
  activeIndex: number;
  onHover: (i: number) => void;
  onActivate: (row: PanelRow) => void;
}) {
  const questionRows = rows.filter((r): r is Extract<PanelRow, { kind: "question" }> => r.kind === "question");
  const recentRows = rows.filter((r): r is Extract<PanelRow, { kind: "recent" }> => r.kind === "recent");

  return (
    <div className="max-h-[420px] overflow-y-auto p-2">
      {questionRows.length > 0 ? (
        <div className="px-2 py-1.5">
          <p className="px-0.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">Ask AI</p>
          {questionRows.map((row) => {
            const i = rows.indexOf(row);
            return (
              <button
                key={row.text}
                type="button"
                onMouseEnter={() => onHover(i)}
                onClick={() => onActivate(row)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-sm",
                  i === activeIndex ? "bg-[var(--color-ai-bg)]" : "hover:bg-[var(--color-canvas)]",
                )}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
                <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">{row.text}</span>
                <span className="shrink-0 rounded-[4px] bg-[var(--color-chip)] px-2 py-0.5 text-[11px] text-[var(--color-ink-subtle)]">{row.tag}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {recentRows.length > 0 ? (
        <div className="px-2 py-1.5">
          <p className="px-0.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">Recent</p>
          {recentRows.map((row) => {
            const i = rows.indexOf(row);
            const Icon = RECORD_ICON[row.recordType as keyof typeof RECORD_ICON] ?? User;
            return (
              <button
                key={`${row.recordType}-${row.id}`}
                type="button"
                onMouseEnter={() => onHover(i)}
                onClick={() => onActivate(row)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-sm",
                  i === activeIndex ? "bg-[var(--color-canvas)]" : "hover:bg-[var(--color-canvas)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--color-ink)]">{row.label}</span>
                  {row.meta ? <span className="block truncate text-xs text-[var(--color-ink-subtle)]">{row.meta}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
