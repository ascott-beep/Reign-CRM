"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createOfferAction } from "./candidate-process-actions";

export function OfferDialog({
  open,
  candidateProcessId,
  onClose,
  onDone,
}: {
  open: boolean;
  candidateProcessId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!candidateProcessId) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createOfferAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create offer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create offer</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="candidateProcessId" value={candidateProcessId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="baseAmount">Base amount</Label>
              <Input id="baseAmount" name="baseAmount" type="number" min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="baseCurrency">Currency</Label>
              <Input id="baseCurrency" name="baseCurrency" defaultValue="GBP" maxLength={3} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offerDate">Offer date</Label>
              <Input id="offerDate" name="offerDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proposedStartDate">Proposed start date</Label>
              <Input id="proposedStartDate" name="proposedStartDate" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
