import { Sparkles, Building2, Briefcase, TrendingUp, Users, CornerDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PanelRow, SearchGroup } from "./types";

const GROUP_ICON: Record<string, typeof Building2> = { organizations: Building2, mandates: Briefcase, opportunities: TrendingUp, people: Users, intelligence: Sparkles };

/** Round 4 screen 03 (R4SearchResults): "Ask AI about …" first, then matches grouped by type; never "No results" next to the Ask AI row. */
export function AskAiResultsView({
  query,
  groups,
  loading,
  typeFilter,
  rows,
  activeIndex,
  onHover,
  onActivate,
}: {
  query: string;
  groups: SearchGroup[];
  loading: boolean;
  typeFilter: string | null;
  rows: PanelRow[];
  activeIndex: number;
  onHover: (i: number) => void;
  onActivate: (row: PanelRow) => void;
}) {
  const visibleGroups = typeFilter ? groups.filter((g) => g.type === typeFilter) : groups;
  const hasAnyMatches = groups.some((g) => g.items.length > 0);

  return (
    <div className="max-h-[460px] overflow-y-auto p-2">
      <div className="px-2 py-1.5">
        <button
          type="button"
          onMouseEnter={() => onHover(0)}
          onClick={() => onActivate(rows[0]!)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-sm font-medium",
            activeIndex === 0 ? "bg-[var(--color-ai-bg)]" : "hover:bg-[var(--color-canvas)]",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
          <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">
            Ask AI about &ldquo;{query}&rdquo;
          </span>
          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-subtle)]" />
        </button>
      </div>

      {loading ? <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-subtle)]">Searching…</p> : null}

      {!loading && !hasAnyMatches ? <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-subtle)]">No records match</p> : null}

      {!loading
        ? visibleGroups.map((group) => {
            const Icon = GROUP_ICON[group.type] ?? Building2;
            return (
              <div key={group.type} className="px-2 py-1.5">
                <p className="px-0.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">{group.label}</p>
                {group.items.map((item) => {
                  const i = rows.findIndex((r) => r.kind === "result" && r.item.id === item.id && r.groupLabel === group.label);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => onHover(i)}
                      onClick={() => onActivate(rows[i]!)}
                      className={cn("flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-sm", i === activeIndex ? "bg-[var(--color-canvas)]" : "hover:bg-[var(--color-canvas)]")}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[var(--color-ink)]">{item.title}</span>
                        {item.subtitle ? (
                          <span className={cn("block truncate text-xs", item.duplicate ? "text-[var(--color-status-warning-ink)]" : "text-[var(--color-ink-subtle)]")}>{item.subtitle}</span>
                        ) : null}
                      </span>
                      {item.duplicate ? (
                        <Badge tone="warning" className="shrink-0">
                          Duplicate
                        </Badge>
                      ) : item.tag ? (
                        <span className="shrink-0 rounded-[4px] bg-[var(--color-chip)] px-2 py-0.5 text-[11px] text-[var(--color-ink-subtle)]">{item.tag}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })
        : null}
    </div>
  );
}
