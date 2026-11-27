"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { erasePersonAction } from "../../people/gdpr-actions";

/** Section 10.1 GDPR erasure — "Delete now" on a person row in Recently deleted. */
export function EraseButton({ personId, label }: { personId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button type="button" size="sm" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" /> Delete now
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {label} for good?</DialogTitle>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              This removes them permanently right now, including their notes and documents — not in 30 days. This can&apos;t be
              undone.
            </p>
          </DialogHeader>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await erasePersonAction(personId);
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to delete this person.");
                  }
                })
              }
            >
              {pending ? "Deleting…" : "Delete for good"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
