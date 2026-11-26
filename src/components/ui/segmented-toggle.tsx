"use client";

import { cn } from "@/lib/utils";

/** SPEC.md section 3 "Segmented toggle": 1px border container, 3px padding, 28px-tall options, selected = navy fill. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  name,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("inline-flex rounded-control border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-[30px] rounded-[3px] px-3.5 text-[13px] transition-colors",
            value === o.value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
