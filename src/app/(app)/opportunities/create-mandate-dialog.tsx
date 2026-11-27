"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import { formatMoneyAsTyped } from "@/components/ui/money-input";
import { CURRENCIES } from "@/lib/iso";
import { convertOpportunityToMandateAction } from "./actions";

type WonDetails = {
  opportunityName: string;
  orgName: string;
  role: string;
  ownerId: string;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string;
  users: { id: string; name: string }[];
  clientContactName: string | null;
  clientContactCount: number;
  activityCount: number;
  noteCount: number;
  documentCount: number;
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
  const [agreedFeeCurrency, setAgreedFeeCurrency] = useState("GBP");
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
        setAgreedFeeCurrency(d.estimatedFeeCurrency);
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
      fd.set("agreedFeeCurrency", agreedFeeCurrency);
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
          <DialogTitle>Win this opportunity</DialogTitle>
          {current ? (
            <DialogDescription>
              {current.role} · {current.orgName}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!current ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-[18px] py-1">
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div>
                <Label htmlFor="agreedFeeCurrency">Agreed fee</Label>
                <Select value={agreedFeeCurrency} onValueChange={setAgreedFeeCurrency}>
                  <SelectTrigger id="agreedFeeCurrency" className="w-24">
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
              <div>
                <Label htmlFor="agreedFee">&nbsp;</Label>
                <Input
                  id="agreedFee"
                  type="text"
                  inputMode="decimal"
                  value={formatMoneyAsTyped(agreedFee, agreedFeeCurrency)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setAgreedFee(digits ? String(Number(digits)) : "");
                  }}
                />
              </div>
            </div>
            {current.estimatedFeeAmount ? (
              <p className="-mt-3 text-xs text-[var(--color-muted)]">
                Estimate on the opportunity was {formatMoney(current.estimatedFeeAmount, current.estimatedFeeCurrency)}
              </p>
            ) : null}

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

            <div className="flex items-start gap-2.5 rounded-[6px] bg-[var(--color-sunk)] px-3.5 py-3 text-[13px] text-[var(--color-ink-subtle)]">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                These move to the new mandate:{" "}
                {current.clientContactName ? `${current.clientContactName} as client contact, ` : current.clientContactCount > 0 ? `${current.clientContactCount} client contacts, ` : ""}
                {current.activityCount} activit{current.activityCount === 1 ? "y" : "ies"}, {current.noteCount} note{current.noteCount === 1 ? "" : "s"} and {current.documentCount} file
                {current.documentCount === 1 ? "" : "s"}. The opportunity is marked Won only when you confirm.
              </span>
            </div>

            {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="items-center">
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
            {pending ? "Creating…" : "Win and create mandate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
