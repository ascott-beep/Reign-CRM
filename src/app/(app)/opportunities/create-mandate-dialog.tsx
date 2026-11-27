"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { formatMoney } from "@/lib/utils";
import { convertOpportunityToMandateAction } from "./actions";

type WonDetails = {
  opportunityName: string;
  orgName: string;
  role: string;
  ownerId: string;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string;
  hiringManagerName: string | null;
  fundName: string | null;
  alreadyConverted: boolean;
  users: { id: string; name: string }[];
};

const FEE_TYPES = [
  { value: "RETAINED", label: "Retained" },
  { value: "CONTINGENT", label: "Contingent" },
  { value: "INTERIM", label: "Interim" },
] as const;

/** d01 "Create the mandate for this search" — opens when an opportunity is moved to Won. */
export function CreateMandateDialog({ open, opportunityId, onClose }: { open: boolean; opportunityId: string | null; onClose: () => void }) {
  const router = useRouter();
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [data, setData] = useState<WonDetails | null>(null);
  const [role, setRole] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [engagementModel, setEngagementModel] = useState<(typeof FEE_TYPES)[number]["value"]>("RETAINED");
  const [agreedFee, setAgreedFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [minBase, setMinBase] = useState("");
  const [maxBase, setMaxBase] = useState("");
  const [signedTerms, setSignedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !opportunityId) return;
    fetch(`/api/opportunities/${opportunityId}/won-details`)
      .then((r) => r.json())
      .then((d: WonDetails) => {
        setData(d);
        setLoadedFor(opportunityId);
        setRole(d.role);
        setOwnerId(d.ownerId);
        setAgreedFee(d.estimatedFeeAmount ?? "");
      })
      .catch(() => setError("Could not load this opportunity."));
  }, [open, opportunityId]);

  if (!open || !opportunityId) return null;
  const current = loadedFor === opportunityId ? data : null;

  const feeNumber = Number(agreedFee) || 0;
  const instalment = feeNumber > 0 ? feeNumber / 3 : 0;

  async function handleSubmit() {
    if (!opportunityId) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("title", role);
      fd.set("ownerId", ownerId);
      fd.set("engagementModel", engagementModel);
      if (agreedFee) fd.set("agreedFeeAmount", agreedFee);
      if (startDate) fd.set("startDate", startDate);
      if (minBase) fd.set("minBaseAmount", minBase);
      if (maxBase) fd.set("maxBaseAmount", maxBase);
      fd.set("signedTerms", String(signedTerms));
      await convertOpportunityToMandateAction(opportunityId, fd);
    } catch {
      // convertOpportunityToMandateAction redirects on success (throws NEXT_REDIRECT) — only real errors land here.
      setError("Failed to create the mandate.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create the mandate for this search</DialogTitle>
          {current ? (
            <DialogDescription>
              You marked {current.opportunityName} as won. Check the details carried over, then start the search at Brief.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {!current ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-[18px] py-1">
            <div>
              <Label>Client</Label>
              <div className="flex h-10 items-center justify-between rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm">
                <span className="truncate">{current.orgName}</span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">From opportunity</span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">Client, hiring manager and fund are carried over from the opportunity.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hiring manager</Label>
                <div className="flex h-10 items-center rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm">
                  <span className="truncate">{current.hiringManagerName ?? "—"}</span>
                </div>
              </div>
              <div>
                <Label>Introduced by</Label>
                <div className="flex h-10 items-center rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm">
                  <span className="truncate">{current.fundName ?? "—"}</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Fee type</Label>
              <SegmentedToggle options={FEE_TYPES} value={engagementModel} onChange={setEngagementModel} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agreedFee">Agreed fee</Label>
                <Input id="agreedFee" type="number" min={0} value={agreedFee} onChange={(e) => setAgreedFee(e.target.value)} />
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
            </div>

            <div>
              <Label>Base salary range</Label>
              <div className="flex gap-2">
                <Input type="number" min={0} placeholder="Min" value={minBase} onChange={(e) => setMinBase(e.target.value)} />
                <Input type="number" min={0} placeholder="Max" value={maxBase} onChange={(e) => setMaxBase(e.target.value)} />
              </div>
            </div>

            {feeNumber > 0 ? (
              <div>
                <Label>Fee instalments</Label>
                <div className="rounded-md border border-[var(--color-line)]">
                  {[
                    { label: "Retainer", when: "On brief" },
                    { label: "Shortlist", when: "At shortlist" },
                    { label: "Completion", when: "On placement" },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[1fr_110px_120px] items-center gap-3 px-3 py-2.5 text-sm ${i > 0 ? "border-t border-[var(--color-line)]" : ""}`}
                    >
                      <span>{row.label}</span>
                      <span className="text-[13px] text-[var(--color-muted)]">{row.when}</span>
                      <span className="text-right">{formatMoney(instalment, current.estimatedFeeCurrency)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">Split in thirds by default. Each instalment prompts an invoice when its stage is reached.</p>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-ink)]">
              <Checkbox checked={signedTerms} onCheckedChange={(v) => setSignedTerms(v === true)} />
              Terms of business signed
            </label>

            {error ? <p className="text-sm text-[var(--color-warn)]">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="items-center">
          <span className="mr-auto text-[13px] text-[var(--color-muted)]">The opportunity is marked Won either way.</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
              router.refresh();
            }}
          >
            Not now
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!current || pending}>
            {pending ? "Creating…" : "Create mandate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
