"use client";

import { cn } from "@/lib/utils";

/**
 * Round 5 screens 02/04/05/06: loose rounded pills (not a single bordered
 * toggle group) for a field where several of a short fixed list can be
 * picked at once — Strategy, Regions, Practice, Deal experience, Open to.
 * Pass `multi={false}` for a single choice that still reads as a row of
 * pills rather than a dropdown (e.g. a short enum with few options).
 */
export function PillSelect({
  options,
  value,
  onChange,
  multi = true,
  name,
}: {
  options: readonly { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  multi?: boolean;
  name?: string;
}) {
  function toggle(optionValue: string) {
    if (multi) {
      onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
    } else {
      onChange(value.includes(optionValue) ? [] : [optionValue]);
    }
  }

  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(o.value)}
            className={cn(
              "h-7 rounded-full border px-3.5 text-[12.5px] transition-colors",
              selected
                ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]"
                : "border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink2)] hover:bg-[var(--color-active)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
