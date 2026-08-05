"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchGroup = {
  type: string;
  label: string;
  items: { id: string; title: string; subtitle: string; href: string }[];
};

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState<SearchGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmedQuery = query.trim();
  const visibleGroups = trimmedQuery.length < 2 ? [] : groups;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setGroups(data.groups ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-64 items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 text-sm text-[var(--color-ink-subtle)] transition-colors hover:border-[var(--color-border-strong)]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false} className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
                <Search className="h-4 w-4 text-[var(--color-ink-subtle)]" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={handleQueryChange}
                  placeholder="Search organisations, people, opportunities, mandates…"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-subtle)]"
                />
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-2">
                {loading ? <div className="px-2 py-6 text-center text-sm text-[var(--color-ink-subtle)]">Searching…</div> : null}
                {!loading && trimmedQuery.length >= 2 && visibleGroups.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-[var(--color-ink-subtle)]">No results</div>
                ) : null}
                {visibleGroups.map((group) => (
                  <Command.Group
                    key={group.type}
                    heading={group.label}
                    className={cn(
                      "px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]",
                      "[&_[cmdk-group-items]]:mt-1",
                    )}
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer flex-col rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--color-canvas)]"
                      >
                        <span className="font-medium text-[var(--color-ink)]">{item.title}</span>
                        {item.subtitle ? (
                          <span className="text-xs text-[var(--color-ink-subtle)]">{item.subtitle}</span>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      ) : null}
    </>
  );
}
