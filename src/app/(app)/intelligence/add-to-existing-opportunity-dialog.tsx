"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { label } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { searchOpenOpportunitiesForOrganizationAction, linkIntelligenceToExistingOpportunityAction, type OpenOpportunityOption } from "./actions";

/** Round 5 screen 11 "Add to existing opportunity" -- a search of open opportunities for the signal's own client organisation. */
export function AddToExistingOpportunityDialog({
  item,
  open,
  onClose,
}: {
  item: { id: string; organization: { id: string; name: string } };
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<OpenOpportunityOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loading = options === null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    searchOpenOpportunitiesForOrganizationAction(item.organization.id, query).then((rows) => {
      if (!cancelled) setOptions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, item.organization.id, query]);

  function confirm() {
    if (!selectedId) return;
    startTransition(async () => {
      await linkIntelligenceToExistingOpportunityAction(item.id, selectedId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to existing opportunity</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-[var(--color-ink-subtle)]">Open opportunities for {item.organization.name}</p>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-[var(--color-ink-subtle)]">Loading…</p>
          ) : (options ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-ink-subtle)]">No open opportunities found.</p>
          ) : (
            (options ?? []).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  "flex items-center justify-between rounded-[6px] border px-3 py-2 text-left text-[13.5px]",
                  selectedId === o.id ? "border-[var(--color-navy)]" : "border-[var(--color-line)]",
                )}
              >
                <span>{o.name}</span>
                <span className="text-xs text-[var(--color-ink-subtle)]">{label(o.stage)}</span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !selectedId} onClick={confirm}>
            {pending ? "Linking…" : "Add signal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
