"use client";

import { useState, useTransition } from "react";
import { UserX, AlertTriangle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { anonymisePersonAction } from "./gdpr-actions";

const REMOVED = ["Name and contact details", "CV and documents", "Notes and emails", "Employment history"];

/** Round 4 screen 25 (DlgR4Anonymise) — the alternative to deletion for a placed candidate (section 10.1). */
export function AnonymiseButton({ personId, firstName, mandateTitle }: { personId: string; firstName: string; mandateTitle: string | null }) {
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [pending, startTransition] = useTransition();

  const kept = [
    mandateTitle ? `Placement on ${mandateTitle}` : "Placement record",
    "Fee and invoice figures",
    'Shown as "Anonymised person"',
    "Audit entry, no personal data",
  ];

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <UserX className="h-[14px] w-[14px]" /> Anonymise
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setUnderstood(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymise {firstName}?</DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-2.5 rounded-[6px] bg-[var(--color-status-warning-bg)] px-3.5 py-3 text-[13.5px] text-[var(--color-status-warning-ink)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {firstName} was placed on a search with fees, so they can&apos;t be deleted. Anonymising removes their personal details and keeps the placement and fee
              figures.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-[var(--color-ink-subtle)]">Removed for good</p>
              {REMOVED.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[var(--color-ink)]">
                  <X className="h-3.5 w-3.5 shrink-0 text-[var(--color-warn)]" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-[var(--color-ink-subtle)]">Kept</p>
              {kept.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[var(--color-ink)]">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-pos)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} />
            I understand this can&apos;t be undone
          </label>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !understood}
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
