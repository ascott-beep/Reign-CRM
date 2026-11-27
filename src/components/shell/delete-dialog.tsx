"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { AlertTriangle } from "lucide-react";
import { formatLongDate } from "@/lib/datetime";
import { deleteRecordAction } from "@/lib/delete-actions";
import type { DeletableType, DeleteImpact } from "@/lib/delete";

const REASONS = [
  { value: "Created by mistake", label: "Created by mistake" },
  { value: "Duplicate", label: "Duplicate" },
  { value: "Test data", label: "Test data" },
  { value: "Other", label: "Other" },
] as const;

/** d11/d12 — fetches impact on open, then shows the delete confirmation or the blocked variant. */
export function DeleteDialog({ type, id, listHref, onClose }: { type: DeletableType; id: string; listHref: string; onClose: () => void }) {
  const router = useRouter();
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"] | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreDeadline] = useState(() => formatLongDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));

  useEffect(() => {
    fetch(`/api/delete-impact?type=${type}&id=${id}`)
      .then((r) => r.json())
      .then((d: DeleteImpact) => {
        setImpact(d);
        setLoadedFor(id);
      })
      .catch(() => setError("Could not load what's linked to this record."));
  }, [type, id]);

  const current = loadedFor === id ? impact : null;

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteRecordAction(type, id, reason || undefined);
      router.push(`${listHref}?deleted=${id}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete this record.");
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[600px]">
        {!current ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : current.blocked ? (
          <>
            <DialogHeader>
              <DialogTitle>This {typeNoun(type)} can&apos;t be deleted</DialogTitle>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">{current.subtitle}</p>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-1">
              <div className="flex items-start gap-2.5 rounded-[4px] bg-[var(--color-status-warning-bg)] p-3.5 text-sm text-[var(--color-ink)]">
                <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-warn)]" />
                <span>{current.blocked.message}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" asChild>
                <a href={current.blocked.alternativeHref}>{current.blocked.alternativeLabel}</a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{current.title}</DialogTitle>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">{current.subtitle}</p>
            </DialogHeader>
            <div className="flex flex-col gap-[18px] py-1">
              <div className="overflow-hidden rounded-[4px] border border-[var(--color-line)]">
                <div className="border-b border-[var(--color-line)] bg-[var(--color-sunk)] px-3.5 py-2.5 text-[13px] text-[var(--color-muted)]">
                  What happens to everything linked to it
                </div>
                {current.linked.map((row, i) => (
                  <div key={row.label} className={`grid grid-cols-[150px_minmax(0,1fr)] gap-3 px-3.5 py-2.5 text-sm ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}>
                    <span>{row.label}</span>
                    <span className="text-[13.5px] text-[var(--color-ink2)]">{row.detail}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] text-[var(--color-ink2)]">Why are you deleting it?</span>
                <SegmentedToggle options={REASONS} value={reason} onChange={setReason} />
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">Optional. Shown in Recently deleted and the audit log.</p>
              </div>
              <div className="flex items-start gap-2.5 rounded-[4px] bg-[var(--color-chip-strong)] p-3.5 text-[13.5px] text-[var(--color-chip-strong-ink)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>You can restore it from Settings → Recently deleted until {restoreDeadline}. After that it is removed for good.</span>
              </div>
              {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
                {pending ? "Deleting…" : `Delete ${typeNoun(type)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function typeNoun(type: DeletableType) {
  return { ORGANIZATION: "organisation", PERSON: "person", MANDATE: "mandate", OPPORTUNITY: "opportunity" }[type];
}
