"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Round 2 section 1 "Segmented toggles": 36px tall overall including the 1px border (1 + 3px inset + 28px pill + 3px inset + 1 = 36), same height as a Button; 4px pill radius; selected = navy inset pill, not a block of a different size. */
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
            "h-7 rounded-[4px] px-3.5 text-[13px] transition-colors",
            value === o.value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Same visuals as SegmentedToggle, for options that navigate (query-param
 * driven views) instead of calling onChange. Each option carries its own
 * `href` (a plain string, not a function) so a Server Component page can
 * render this directly — a function prop can't cross the server/client
 * boundary.
 */
export function LinkSegmentedToggle<T extends string>({
  options,
  value,
  className,
  name,
}: {
  options: readonly { value: T; label: string; href: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  className?: string;
  name?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("inline-flex rounded-control border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]", className)}>
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          role="radio"
          aria-checked={value === o.value}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-[4px] px-3.5 text-[13px] no-underline transition-colors",
            value === o.value ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
          )}
        >
          {o.icon ? <o.icon className="h-3.5 w-3.5" /> : null}
          {o.label}
        </Link>
      ))}
    </div>
  );
}
