"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConnectionRow } from "./connection-card";
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

/** Round 4 screen 33 (R4SetConnections) — one row; the sweep/signal-type controls open behind "Manage" instead of sitting inline. */
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
  const [open, setOpen] = useState(false);

  function toggleType(t: IntelligenceType) {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <ConnectionRow
      icon={<Sparkles className="h-4 w-4 text-[var(--color-ai-icon)]" />}
      title="Claude"
      description="Powers Ask AI, Research now and Intelligence."
      status={configured ? "connected" : "not-connected"}
      detail={configured ? lastRunDetail : "Not set up yet."}
      control={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI research · Claude</DialogTitle>
              </DialogHeader>
              <form
                action={async (formData) => {
                  await updateAiResearchSettingsAction(formData);
                  setOpen(false);
                }}
                className="flex flex-col gap-3.5"
              >
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

                <DialogFooter>
                  <SaveButton />
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null
      }
    />
  );
}
