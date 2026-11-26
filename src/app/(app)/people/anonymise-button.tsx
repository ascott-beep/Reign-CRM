"use client";

import { useState, useTransition } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { anonymisePersonAction } from "./gdpr-actions";

/** Section 10.1 — the alternative to deletion for a placed candidate. */
export function AnonymiseButton({ personId, firstName }: { personId: string; firstName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <UserX className="h-[14px] w-[14px]" /> Anonymise
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymise {firstName}?</DialogTitle>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              {firstName} was placed, so they can&apos;t be deleted — this replaces their name and contact details with
              &ldquo;Erased person&rdquo; instead. The placement and fee figures stay in your reports. This can&apos;t be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => anonymisePersonAction(personId).then(() => setOpen(false)))}
            >
              {pending ? "Anonymising…" : "Anonymise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
