"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { label } from "@/lib/labels";
import { updateAiResearchSettingsAction } from "../actions";
import type { IntelligenceType } from "@prisma/client";

const ALL_SIGNAL_TYPES: IntelligenceType[] = [
  "LEADERSHIP_CHANGE",
  "POTENTIAL_VACANCY",
  "ACTIVE_VACANCY",
  "ACQUISITION",
  "INTEGRATION",
  "CARVE_OUT",
  "TRANSFORMATION",
  "INTERNATIONAL_EXPANSION",
  "EXIT_PREPARATION",
  "REFINANCING",
  "FINANCE_TEAM_WEAKNESS",
  "FAILED_SEARCH",
  "AGENCY_DISSATISFACTION",
  "CANDIDATE_MOVEMENT",
  "OTHER",
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);

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
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {configured ? lastRunDetail : "Needs ANTHROPIC_API_KEY set before it can run."}
        </p>

        {isAdmin ? (
          <form action={updateAiResearchSettingsAction} className="mt-3.5 flex flex-col gap-3.5 border-t border-[var(--color-line)] pt-3.5">
            <label className="flex items-center gap-2 text-sm">
              <Switch name="sweepEnabled" checked={enabled} onCheckedChange={setEnabled} disabled={!configured} />
              Run the daily sweep
            </label>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sweepHourUtc" className="text-xs text-[var(--color-ink-subtle)]">
                Sweep time (UTC)
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
                    {h.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-muted)]">
                Vercel&rsquo;s free plan only guarantees once-daily cron runs, so one sweep a day at this hour is what&rsquo;s reliably supported.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--color-ink-subtle)]">Signal types</span>
              <div className="flex flex-wrap gap-3">
                {ALL_SIGNAL_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-[13px]">
                    <Checkbox name="signalTypes" value={t} checked={selectedTypes.includes(t)} onCheckedChange={() => toggleType(t)} disabled={!configured} />
                    {label(t)}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--color-muted)]">Leave all selected to catch everything.</p>
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
