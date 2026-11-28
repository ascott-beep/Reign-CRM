"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { label } from "@/lib/labels";
import { CURRENCIES } from "@/lib/iso";
import { placeCandidateAction } from "./candidate-process-actions";

const EMPLOYMENT_TYPES = ["PERMANENT", "INTERIM", "FRACTIONAL", "FIXED_TERM", "CONTRACT"];

export function PlaceCandidateDialog({
  open,
  candidateProcessId,
  onClose,
  onDone,
  onCancelDrag,
}: {
  open: boolean;
  candidateProcessId: string | null;
  onClose: () => void;
  onDone: () => void;
  onCancelDrag?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [offers, setOffers] = useState<{ id: string; status: string; baseAmount: string | null; baseCurrency: string | null }[]>([]);
  const [agreedBaseCurrency, setAgreedBaseCurrency] = useState("GBP");

  useEffect(() => {
    if (!candidateProcessId) return;
    fetch(`/api/candidate-processes/${candidateProcessId}`)
      .then((r) => r.json())
      .then((data) => setOffers(data.offers ?? []))
      .catch(() => setOffers([]));
  }, [candidateProcessId]);

  if (!candidateProcessId) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await placeCandidateAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record placement.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          onCancelDrag?.();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record placement</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="candidateProcessId" value={candidateProcessId} />
          {offers.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acceptedOfferId">Accepted offer</Label>
              <Select name="acceptedOfferId">
                <SelectTrigger id="acceptedOfferId">
                  <SelectValue placeholder="Select offer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.baseAmount ? `${o.baseCurrency} ${o.baseAmount}` : label(o.status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="placementDate">Placement date</Label>
              <Input id="placementDate" name="placementDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employmentType">Employment type</Label>
            <Select name="employmentType" defaultValue="PERMANENT">
              <SelectTrigger id="employmentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {label(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agreedBaseAmount">Agreed base</Label>
              <MoneyInput id="agreedBaseAmount" name="agreedBaseAmount" currency={agreedBaseCurrency} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agreedBaseCurrency">Currency</Label>
              <Select name="agreedBaseCurrency" value={agreedBaseCurrency} onValueChange={setAgreedBaseCurrency}>
                <SelectTrigger id="agreedBaseCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feeAmount">Fee amount</Label>
              <MoneyInput id="feeAmount" name="feeAmount" currency={agreedBaseCurrency} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guaranteeMonths">Guarantee (months)</Label>
              <Input id="guaranteeMonths" name="guaranteeMonths" type="number" min={0} defaultValue={6} />
            </div>
          </div>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record placement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
