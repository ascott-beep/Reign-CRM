"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRACTICES, roleGroupsForPractice, type Practice } from "@/lib/practices";

/**
 * Round 5 screen 10 "Role list by practice": pick the practice(s) first,
 * then this lists exactly that practice's titles, grouped as on
 * reign.partners, with a free-text "Use '…' as the title" fallback at the
 * bottom. With more than one practice selected (a person can span two),
 * groups from every selected practice are shown, each under its own
 * practice heading, deduplicating Board and CEO to appear once.
 */
export function RolePicker({ practices, value, onChange, name }: { practices: Practice[]; value: string; onChange: (value: string) => void; name?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activePractices = practices.length > 0 ? practices : PRACTICES;
  const q = query.trim().toLowerCase();

  type Section = { practiceLabel: string; group: string; titles: string[] };
  const sections: Section[] = [];
  const seenGroups = new Set<string>();
  for (const practice of activePractices) {
    for (const group of roleGroupsForPractice(practice)) {
      const key = `${practice}:${group.group}`;
      if (group.group === "Board and CEO" && seenGroups.has("Board and CEO")) continue;
      if (group.group === "Board and CEO") seenGroups.add("Board and CEO");
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const titles = q ? group.titles.filter((t) => t.toLowerCase().includes(q)) : group.titles;
      if (titles.length > 0) sections.push({ practiceLabel: practice, group: group.group, titles });
    }
  }

  function select(title: string) {
    onChange(title);
    setQuery(title);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative flex h-10 items-center rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          className="w-full bg-transparent outline-none"
        />
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-ink-subtle)]" />
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)]">
          {sections.map((s) => (
            <div key={`${s.practiceLabel}:${s.group}`}>
              <div className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">{s.group}</div>
              {s.titles.map((t) => (
                <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => select(t)} className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--color-active)]">
                  {t}
                </button>
              ))}
            </div>
          ))}
          {query.trim() && !sections.some((s) => s.titles.some((t) => t.toLowerCase() === q)) ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(query.trim())}
              className="flex w-full items-center border-t border-[var(--color-line)] px-3 py-2 text-left text-sm text-[var(--color-ink2)] hover:bg-[var(--color-active)]"
            >
              Use &ldquo;{query.trim()}&rdquo; as the title
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
