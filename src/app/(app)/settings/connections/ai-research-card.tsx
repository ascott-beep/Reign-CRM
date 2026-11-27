"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { label } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { updateAiResearchSettingsAction } from "../actions";
import type { IntelligenceType } from "@prisma/client";

/** Round 3 item 13: compact grouped chips instead of a flat checkbox list. */
const SIGNAL_GROUPS: { heading: string; types: IntelligenceType[] }[] = [
  { heading: "People", types: ["LEADERSHIP_CHANGE", "FINANCE_TEAM_WEAKNESS", "CANDIDATE_MOVEMENT"] },
  { heading: "Hiring", types: ["POTENTIAL_VACANCY", "ACTIVE_VACANCY", "FAILED_SEARCH", "AGENCY_DISSATISFACTION"] },
  { heading: "Deal activity", types: ["ACQUISITION", "INTEGRATION", "CARVE_OUT", "EXIT_PREPARATION", "REFINANCING"] },
  { heading: "Growth & change", types: ["TRANSFORMATION", "INTERNATIONAL_EXPANSION"] },
  { heading: "Other", types: ["OTHER"] },
];
const ALL_SIGNAL_TYPES: IntelligenceType[] = SIGNAL_GROUPS.flatMap((g) => g.types);

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** The cron runs on a fixed UTC hour; shown to the user in UK local time (handles BST/GMT itself). */
function londonTimeLabel(utcHour: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).format(d);
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/** Round 2 section 6 "AI research: Claude ... with sweep time and signal types" — the only Connections card an admin can actually edit today. */
export function AiResearchCard({
  configured,
  isAdmin,
  sweepEnabled,
  sweepHourUtc,
  signalTypes,
  lastRunDetail,
}: {
  configured: boolean;
  isAdmin: boolean;
  sweepEnabled: boolean;
  sweepHourUtc: number;
  signalTypes: IntelligenceType[];
  lastRunDetail: string;
}) {
  const [selectedTypes, setSelectedTypes] = useState<IntelligenceType[]>(signalTypes.length > 0 ? signalTypes : ALL_SIGNAL_TYPES);
  const [enabled, setEnabled] = useState(sweepEnabled);

  function toggleType(t: IntelligenceType) {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">AI research · Claude</h3>
          <Badge tone={configured ? "success" : "neutral"}>{configured ? "Connected" : "Not configured"}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">
          Researches your watchlist daily for finance leadership changes, fundraises, acquisitions, exits and other signals, using web search.
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{configured ? lastRunDetail : "Not set up yet."}</p>

        {isAdmin ? (
          <form action={updateAiResearchSettingsAction} className="mt-3.5 flex flex-col gap-3.5 border-t border-[var(--color-line)] pt-3.5">
            <label className="flex items-center gap-2 text-sm">
              <Switch name="sweepEnabled" checked={enabled} onCheckedChange={setEnabled} disabled={!configured} />
              Run the daily sweep
            </label>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sweepHourUtc" className="text-xs text-[var(--color-ink-subtle)]">
                Sweep time (UK)
              </label>
              <select
                id="sweepHourUtc"
                name="sweepHourUtc"
                defaultValue={sweepHourUtc}
                disabled={!configured}
                className="h-9 w-32 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm disabled:opacity-50"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {londonTimeLabel(h)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-muted)]">Once a day, at this time.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs text-[var(--color-ink-subtle)]">Signal types</span>
              {SIGNAL_GROUPS.map((g) => (
                <div key={g.heading} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 shrink-0 text-[11px] text-[var(--color-muted)]">{g.heading}</span>
                  {g.types.map((t) => {
                    const selected = selectedTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!configured}
                        onClick={() => toggleType(t)}
                        className={cn(
                          "h-7 rounded-full border px-2.5 text-[12px] disabled:opacity-50",
                          selected
                            ? "border-[var(--color-navy)] bg-[var(--color-chip-strong)] text-[var(--color-chip-strong-ink)]"
                            : "border-[var(--color-line)] text-[var(--color-ink2)]",
                        )}
                      >
                        {label(t)}
                      </button>
                    );
                  })}
                </div>
              ))}
              <p className="text-xs text-[var(--color-muted)]">Leave all selected to catch everything.</p>
              {selectedTypes.map((t) => (
                <input key={t} type="hidden" name="signalTypes" value={t} />
              ))}
            </div>

            <div>
              <SaveButton />
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
