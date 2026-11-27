import { cn } from "@/lib/utils";

/**
 * Round 2 section 3 — shared stage progress bar for the opportunity and
 * mandate record headers: current stage plus days spent in each one.
 * Visual language matches the existing mandates/stage-bar.tsx (done/
 * current/future segments); this version also takes a day count per step.
 */
export function StageProgressBar({
  steps,
  currentIndex,
  days,
  stepCountLabel,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
  days: Partial<Record<string, number>>;
  stepCountLabel?: string;
}) {
  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const d = days[s.key];
        return (
          <li key={s.key} className="flex min-w-0 flex-col gap-2.5">
            <span className={cn("h-1.5 rounded-full", done ? "bg-[var(--color-dot)]" : current ? "bg-[var(--color-bar)]" : "bg-[var(--color-track)]")} />
            <span className={cn("truncate text-[13.5px]", current ? "font-medium text-[var(--color-ink)]" : done ? "text-[var(--color-ink2)]" : "text-[var(--color-muted)]")}>
              {s.label}
            </span>
            <span className="truncate text-xs text-[var(--color-muted)]">
              {d === undefined ? "—" : current ? `${d}d so far` : `${d}d`}
            </span>
          </li>
        );
      })}
      {stepCountLabel ? <li className="sr-only">{stepCountLabel}</li> : null}
    </ol>
  );
}
