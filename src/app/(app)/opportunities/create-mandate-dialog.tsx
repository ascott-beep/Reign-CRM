"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import { formatMoneyAsTyped } from "@/components/ui/money-input";
import { convertOpportunityToMandateAction } from "./actions";

type WonDetails = {
  opportunityName: string;
  orgName: string;
  role: string;
  ownerId: string;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string;
  users: { id: string; name: string }[];
};

/**
 * d01 "Create the mandate for this search" — opens when an opportunity is moved to Won.
 * ROUND-2.md section 2: "a short dialog: fee, start date, lead consultant. Everything else
 * carries over automatically... role, contacts, notes, files and activity history." Those
 * three fields are all this dialog asks for; everything else is editable on the mandate itself.
 */
export function CreateMandateDialog({ open, opportunityId, onClose }: { open: boolean; opportunityId: string | null; onClose: () => void }) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [data, setData] = useState<WonDetails | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !opportunityId) return;
    fetch(`/api/opportunities/${opportunityId}/won-details`)
      .then((r) => r.json())
      .then((d: WonDetails) => {
        setData(d);
        setLoadedFor(opportunityId);
        setOwnerId(d.ownerId);
        setAgreedFee(d.estimatedFeeAmount ?? "");
      })
      .catch(() => setError("Could not load this opportunity."));
  }, [open, opportunityId]);

  if (!open || !opportunityId) return null;
  const current = loadedFor === opportunityId ? data : null;

  async function handleSubmit() {
    if (!opportunityId) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("ownerId", ownerId);
      if (agreedFee) fd.set("agreedFeeAmount", agreedFee);
      if (startDate) fd.set("startDate", startDate);
      await convertOpportunityToMandateAction(opportunityId, fd);
    } catch {
      // convertOpportunityToMandateAction redirects on success (throws NEXT_REDIRECT) — only real errors land here.
      setError("Failed to create the mandate.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create the mandate for this search</DialogTitle>
          {current ? (
            <DialogDescription>
              {current.role} · {current.orgName}, role, contacts, notes, files and activity history all carry over. Edit anything else on the mandate.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!current ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-[18px] py-1">
            <div>
              <Label htmlFor="agreedFee">Agreed fee</Label>
              <Input
                id="agreedFee"
                type="text"
                inputMode="decimal"
                value={formatMoneyAsTyped(agreedFee, current.estimatedFeeCurrency)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setAgreedFee(digits ? String(Number(digits)) : "");
                }}
              />
              {current.estimatedFeeAmount ? (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  Estimate on the opportunity was {formatMoney(current.estimatedFeeAmount, current.estimatedFeeCurrency)}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="owner">Lead consultant</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {current.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="items-center">
          <span className="mr-auto text-[13px] text-[var(--color-muted)]">Creating the mandate marks this opportunity Won.</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!current || pending}>
            {pending ? "Creating…" : "Create mandate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
