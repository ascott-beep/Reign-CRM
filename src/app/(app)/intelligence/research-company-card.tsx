"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useResearchPanel } from "@/components/shell/research-panel/research-panel-provider";
import { isTodayInLondon } from "@/lib/datetime";

/** Round 4 screen 30 (R4Intel) right column, top card. */
export function ResearchCompanyCard() {
  const { openByName } = useResearchPanel();
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    openByName(name.trim());
  }

  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <h3 className="text-[15px] font-medium text-[var(--color-ink)]">Research a company</h3>
      <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">Atlas reads news, filings, LinkedIn and company sites, then suggests what to do.</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
        <Button type="submit" disabled={!name.trim()}>
          <Sparkles className="h-[14px] w-[14px]" /> Research now
        </Button>
      </form>
    </div>
  );
}

export type WatchingRow = { id: string; name: string; newCount: number; lastCheckedAt: Date | null };

function checkedLabel(row: WatchingRow) {
  if (!row.lastCheckedAt) return "Not yet checked";
  return isTodayInLondon(row.lastCheckedAt) ? "Checked today" : "Checked earlier";
}

export function WatchingCard({ rows, sweepTimeLabel }: { rows: WatchingRow[]; sweepTimeLabel: string | null }) {
  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <h3 className="text-[15px] font-medium text-[var(--color-ink)]">Watching</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--color-ink-subtle)]">Priority organisations, PE funds and their portfolio companies, and any company with an open search are watched automatically.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <Link key={row.id} href={`/organisations/${row.id}`} className="flex items-center justify-between text-[13.5px] hover:text-[var(--color-accent)]">
              <span className="truncate text-[var(--color-ink)]">{row.name}</span>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">{row.newCount > 0 ? `${row.newCount} new` : checkedLabel(row)}</span>
            </Link>
          ))}
        </div>
      )}
      {sweepTimeLabel ? <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">Checked every morning at {sweepTimeLabel} UK time.</p> : null}
    </div>
  );
}
