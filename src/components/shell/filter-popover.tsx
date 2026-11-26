"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export type FilterOption = { value: string; label: string; count: number };
export type FilterGroup = { key: string; label: string; options: FilterOption[] };

/** d10 "Filter popover" — generic over a set of checkbox groups, state lives in the URL. */
export function FilterPopover({
  groups,
  selected,
  resultCount,
  resultNoun,
}: {
  groups: FilterGroup[];
  /** Currently-selected values per group key, read from the URL by the server page. */
  selected: Record<string, string[]>;
  resultCount: number;
  resultNoun: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string[]>>(selected);

  const totalSelected = Object.values(draft).reduce((n, v) => n + v.length, 0);

  function toggle(groupKey: string, value: string) {
    setDraft((d) => {
      const current = d[groupKey] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...d, [groupKey]: next };
    });
  }

  function apply(next: Record<string, string[]>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const group of groups) {
      params.delete(group.key);
      for (const v of next[group.key] ?? []) params.append(group.key, v);
    }
    router.push(`?${params.toString()}`);
  }

  function removeChip(groupKey: string, value: string) {
    const next = { ...draft, [groupKey]: (draft[groupKey] ?? []).filter((v) => v !== value) };
    setDraft(next);
    apply(next);
  }

  const chips = groups.flatMap((g) => (selected[g.key] ?? []).map((v) => ({ group: g, option: g.options.find((o) => o.value === v) })));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) setDraft(selected);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex h-9 items-center gap-1.5 rounded-md border px-4 text-[13px] ${open || totalSelected > 0 ? "border-[var(--color-navy)]" : "border-[var(--color-line)]"} bg-[var(--color-card)] text-[var(--color-ink)]`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter {totalSelected > 0 ? <span className="text-[var(--color-muted)]">{totalSelected}</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[560px] p-0">
          <div className="grid grid-cols-2 gap-x-7 gap-y-5 p-[20px_22px]">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="mb-2 text-[13px] text-[var(--color-muted)]">{group.label}</div>
                <div className="flex flex-col gap-0.5">
                  {group.options.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => toggle(group.key, opt.value)}
                      className="flex w-full cursor-pointer items-center gap-2.5 py-[5px] text-left text-sm text-[var(--color-ink)]"
                    >
                      <Checkbox checked={(draft[group.key] ?? []).includes(opt.value)} />
                      <span className="flex-1">{opt.label}</span>
                      <span className="text-[12.5px] text-[var(--color-muted)]">{opt.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--color-line)] px-[22px] py-3">
            <button
              type="button"
              onClick={() => {
                const cleared = Object.fromEntries(groups.map((g) => [g.key, []]));
                setDraft(cleared);
                apply(cleared);
              }}
              className="text-[13.5px] text-[var(--color-ink2)]"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => {
                apply(draft);
                setOpen(false);
              }}
              className="h-9 rounded-md bg-[var(--color-navy)] px-[18px] text-[13px] font-medium text-[var(--color-navy-ink)]"
            >
              Show {resultCount} {resultNoun}
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {chips.map(({ group, option }) =>
        option ? (
          <span key={`${group.key}:${option.value}`} className="flex h-[30px] items-center gap-1.5 rounded-md bg-[var(--color-chip-strong)] px-2.5 text-[13px] text-[var(--color-chip-strong-ink)]">
            {option.label}
            <button type="button" onClick={() => removeChip(group.key, option.value)} aria-label={`Remove ${option.label} filter`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : null,
      )}
    </div>
  );
}
