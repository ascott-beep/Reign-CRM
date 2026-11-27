"use client";

import { cn } from "@/lib/utils";

/**
 * Round 2 section 3 — shared stage progress bar for the opportunity and
 * mandate record headers: current stage plus days spent in each one.
 * Visual language matches the existing mandates/stage-bar.tsx (done/
 * current/future segments); this version also takes a day count per step.
 *
 * Round 3 item 8: pass `onStepClick` to make every step but the current one
 * and the last (Won/Filled — those go through their own dedicated button)
 * clickable, replacing the old separate stage dropdown.
 */
export function StageProgressBar({
  steps,
  currentIndex,
  days,
  stepCountLabel,
  onStepClick,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
  days: Partial<Record<string, number>>;
  stepCountLabel?: string;
  onStepClick?: (key: string, index: number) => void;
}) {
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const d = days[s.key];
        const clickable = Boolean(onStepClick) && !current && i !== steps.length - 1;
        const dayText = d === undefined ? "" : current ? `, ${d} days so far` : `, ${d} days`;
        const stepAriaLabel = `${done ? "Done" : current ? "Current stage" : "Upcoming"}: ${s.label}${dayText}`;
        const content = (
          <>
            <span className={cn("h-1.5 rounded-full", done ? "bg-[var(--color-dot)]" : current ? "bg-[var(--color-bar)]" : "bg-[var(--color-track)]")} />
            <span className={cn("truncate text-[13.5px]", current ? "font-medium text-[var(--color-ink)]" : done ? "text-[var(--color-ink2)]" : "text-[var(--color-muted)]")}>
              {s.label}
            </span>
            <span className="truncate text-xs text-[var(--color-muted)]">
              {d === undefined ? "—" : current ? `${d}d so far` : `${d}d`}
            </span>
          </>
        );
        return (
          <li key={s.key} className="flex min-w-0 flex-col gap-2.5" aria-current={current ? "step" : undefined}>
            {clickable ? (
              <button type="button" onClick={() => onStepClick!(s.key, i)} aria-label={`Move to ${s.label}`} className="flex min-w-0 flex-col gap-2.5 text-left hover:opacity-70">
                {content}
              </button>
            ) : (
              <span aria-label={stepAriaLabel} className="flex min-w-0 flex-col gap-2.5">
                {content}
              </span>
            )}
          </li>
        );
      })}
      {stepCountLabel ? <li className="sr-only">{stepCountLabel}</li> : null}
    </ol>
  );
}
