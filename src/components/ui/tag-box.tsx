"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * A chip box: selected values as removable chips, typing in the trailing
 * input filters a dropdown of the remaining options. With `allowCustom`,
 * anything typed that doesn't match an option can be added as free text
 * (e.g. Languages); without it, only listed options can be chosen (e.g.
 * Offices in, Willing to work in, which are always drawn from COUNTRIES).
 */
export function TagBox({
  options,
  value,
  onChange,
  placeholder = "Add",
  allowCustom = false,
}: {
  options: readonly Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const matches = options.filter((o) => !value.includes(o.value) && o.label.toLowerCase().includes(query.trim().toLowerCase()));

  function add(v: string) {
    if (!value.includes(v)) onChange([...value, v]);
    setQuery("");
    setOpen(false);
  }

  function remove(v: string) {
    onChange(value.filter((x) => x !== v));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && allowCustom && query.trim()) {
      e.preventDefault();
      add(query.trim());
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      remove(value[value.length - 1]!);
    }
  }

  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5">
        {value.map((v) => (
          <span key={v} className="flex h-7 items-center gap-1 rounded-full bg-[var(--color-chip)] px-2.5 text-[12.5px] text-[var(--color-ink)]">
            {labelFor(v)}
            <button type="button" onClick={() => remove(v)} aria-label={`Remove ${labelFor(v)}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-7 min-w-[100px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-[var(--color-ink-subtle)]"
        />
      </div>
      {open && query.trim() && (matches.length > 0 || allowCustom) ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)]">
          {matches.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(o.value)}
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--color-active)]"
            >
              {o.label}
            </button>
          ))}
          {allowCustom && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(query.trim())}
              className={cn("flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--color-active)]", matches.length > 0 && "border-t border-[var(--color-line)]")}
            >
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
