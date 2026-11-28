"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { quickCreateOrganizationAction } from "@/app/(app)/organisations/actions";

type OrgResult = { id: string; name: string; typeLabel?: string };

/**
 * Round 4 screens 26/27: "Organisation is a search box. Typing a new name
 * offers 'Add X as a new organisation' at the bottom of the list." Shared by
 * the person form (screen 26) and any other form that links to an
 * organisation; selecting the "Add new" row creates a bare org (name only)
 * immediately so the picker always ends on a real id, rather than deferring
 * creation to the parent form's own submit.
 */
export function OrganisationCombobox({
  name,
  defaultId,
  defaultName,
  placeholder = "Search",
  onNameChange,
}: {
  name: string;
  defaultId?: string | null;
  defaultName?: string | null;
  placeholder?: string;
  /** Fires with the current text whenever it changes -- e.g. for a live "Client · Role" name suggestion elsewhere on the same form. */
  onNameChange?: (name: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(defaultId ?? "");
  const [query, setQuery] = useState(defaultName ?? "");

  useEffect(() => {
    onNameChange?.(defaultName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<OrgResult[]>([]);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!open || !query.trim()) {
        setResults([]);
        return;
      }
      fetch(`/api/organizations/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d: { results: OrgResult[] }) => setResults(d.results ?? []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  function select(org: OrgResult) {
    setSelectedId(org.id);
    setQuery(org.name);
    setOpen(false);
    onNameChange?.(org.name);
  }

  async function addNew() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const org = await quickCreateOrganizationAction(name);
      select(org);
    } finally {
      setCreating(false);
    }
  }

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <div className="relative flex h-10 items-center rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
        <Building2 className="mr-2 h-[15px] w-[15px] shrink-0 text-[var(--color-ink-subtle)]" />
        <input
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
            setOpen(true);
          }}
          className="w-full bg-transparent outline-none placeholder:text-[var(--color-ink-subtle)]"
        />
      </div>

      {open && query.trim() ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)]">
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => select(o)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-active)]"
            >
              <Building2 className="h-[14px] w-[14px] shrink-0 text-[var(--color-ink-subtle)]" />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">{o.typeLabel}</span>
            </button>
          ))}
          {!exactMatch ? (
            <button
              type="button"
              onClick={addNew}
              disabled={creating}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-ai-icon)] hover:bg-[var(--color-ai-bg)]",
                results.length > 0 && "border-t border-[var(--color-line)]",
              )}
            >
              {creating ? <Loader2 className="h-[14px] w-[14px] shrink-0 animate-spin" /> : <Plus className="h-[14px] w-[14px] shrink-0" />}
              Add &ldquo;{query.trim()}&rdquo; as a new organisation
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
