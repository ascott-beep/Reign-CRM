import { cn } from "@/lib/utils";
import { MANDATE_STAGE_BAR_STEPS, MANDATE_STAGE_BAR_LABELS, mandateStageBarStep } from "@/lib/rules";
import { label } from "@/lib/labels";
import type { MandateStatus } from "@prisma/client";

/** SPEC.md section 3 "Stage bar": 7 equal segments, done/current/future colouring. */
export function StageBar({ status }: { status: MandateStatus }) {
  const step = mandateStageBarStep(status);
  const currentIndex = step - 1;

  return (
    <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 pb-[18px] pt-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-[var(--color-muted)]">
          Search stage <span className="ml-2 text-base font-medium text-[var(--color-ink)]">{label(status)}</span>
        </span>
        <span className="text-[13px] text-[var(--color-muted)]">Step {step} of 7</span>
      </div>
      <ol className="grid grid-cols-7 gap-2">
        {MANDATE_STAGE_BAR_STEPS.map((s, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={s} className="flex min-w-0 flex-col gap-2.5">
              <span className={cn("h-1.5 rounded-full", done ? "bg-[var(--color-dot)]" : current ? "bg-[var(--color-bar)]" : "bg-[var(--color-track)]")} />
              <span
                className={cn(
                  "truncate text-[13.5px]",
                  current ? "font-medium text-[var(--color-ink)]" : done ? "text-[var(--color-ink2)]" : "text-[var(--color-muted)]",
                )}
              >
                {MANDATE_STAGE_BAR_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
