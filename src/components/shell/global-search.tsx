"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchGroup = {
  type: string;
  label: string;
  items: { id: string; title: string; subtitle: string; tag: string | null; href: string }[];
};

const ACTIONS = [
  { id: "new-task", title: "New task", href: "/tasks/new" },
  { id: "new-person", title: "New person", href: "/people/new" },
  { id: "new-organisation", title: "New organisation", href: "/organisations/new" },
  { id: "new-opportunity", title: "New opportunity", href: "/opportunities/new" },
  { id: "new-mandate", title: "New mandate", href: "/mandates/new" },
  { id: "log-activity", title: "Log activity", href: "/activities/new" },
];

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
  const isActionMode = trimmedQuery.startsWith(">");
  const actionQuery = trimmedQuery.slice(1).trim().toLowerCase();
  const matchingActions = isActionMode ? ACTIONS.filter((a) => a.title.toLowerCase().includes(actionQuery)) : [];
  const visibleGroups = isActionMode || trimmedQuery.length < 2 ? [] : groups;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = value.trim();
    if (trimmed.startsWith(">") || trimmed.length < 2) {
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
        aria-label="Search (Cmd+K)"
        title="Search (Cmd+K)"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink2)] transition-colors hover:bg-[var(--color-active)]"
      >
        <Search className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={() => setOpen(false)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false} className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
                <Search className="h-4 w-4 text-[var(--color-ink-subtle)]" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={handleQueryChange}
                  placeholder="Search organisations, people, opportunities, mandates…"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-subtle)]"
                />
                <span className="rounded-[4px] border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-subtle)]">esc</span>
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-2">
                {isActionMode ? (
                  matchingActions.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-[var(--color-ink-subtle)]">No matching actions</div>
                  ) : (
                    <Command.Group
                      heading="Actions"
                      className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] [&_[cmdk-group-items]]:mt-1"
                    >
                      {matchingActions.map((a) => (
                        <Command.Item
                          key={a.id}
                          value={a.id}
                          onSelect={() => go(a.href)}
                          className="flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm font-medium text-[var(--color-ink)] data-[selected=true]:bg-[var(--color-canvas)]"
                        >
                          {a.title}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )
                ) : (
                  <>
                    {loading ? <div className="px-2 py-6 text-center text-sm text-[var(--color-ink-subtle)]">Searching…</div> : null}
                    {!loading && trimmedQuery.length >= 2 && visibleGroups.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-[var(--color-ink-subtle)]">No results</div>
                    ) : null}
                  </>
                )}
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
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--color-canvas)]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[var(--color-ink)]">{item.title}</span>
                          {item.subtitle ? (
                            <span className={cn("block truncate text-xs", item.subtitle === "Possible duplicate" ? "text-[var(--color-status-warning-ink)]" : "text-[var(--color-ink-subtle)]")}>
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {item.tag ? <span className="shrink-0 rounded-[4px] bg-[var(--color-canvas)] px-2 py-1 text-[11px] text-[var(--color-ink-subtle)]">{item.tag}</span> : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
            <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-3 py-2 text-[11.5px] text-[var(--color-ink-subtle)]">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span className="ml-auto">
                Type <span className="font-medium">&gt;</span> for actions, e.g. &quot;&gt; new task&quot;
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
