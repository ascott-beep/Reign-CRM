"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const REASONS: { value: string; label: string }[] = [
  { value: "COMPETITOR_SELECTED", label: "Went to another firm" },
  { value: "INTERNAL_HIRE", label: "Hired internally" },
  { value: "ROLE_CANCELLED", label: "Role cancelled" },
  { value: "TERMS_OR_FEE", label: "Fee or terms" },
  { value: "NO_RESPONSE", label: "No response" },
  { value: "OTHER", label: "Other" },
];

export type LostReasonResult = { lossReason: string; lossExplanation?: string; revisitDate?: string };

/** d05 "Why was this lost?" */
export function LostReasonDialog({
  open,
  context,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** e.g. "Head of Business Control · Bracken Software Solutions · £38,000" */
  context?: string;
  onCancel: () => void;
  onConfirm: (result: LostReasonResult) => void;
}) {
  const [reason, setReason] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [revisitDate, setRevisitDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setReason("");
    setCompetitor("");
    setRevisitDate("");
    setError(null);
  }

  function handleConfirm() {
    if (!reason) {
      setError("A reason is required.");
      return;
    }
    onConfirm({ lossReason: reason, lossExplanation: competitor ? `Lost to: ${competitor}` : undefined, revisitDate: revisitDate || undefined });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onCancel();
          reset();
        }
      }}
    >
      <DialogContent className="max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Why was this lost?</DialogTitle>
          {context ? <DialogDescription>{context}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-[18px] py-1">
          <div className="flex flex-col rounded-md border border-[var(--color-line)]">
            {REASONS.map((r, i) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`flex items-center gap-3 px-3 py-2.5 text-left text-sm text-[var(--color-ink)] ${i > 0 ? "border-t border-[var(--color-line)]" : ""} ${reason === r.value ? "bg-[var(--color-active)]" : ""}`}
              >
                <span className={`h-4 w-4 shrink-0 rounded-full border-[1.5px] ${reason === r.value ? "border-[5px] border-[var(--color-navy)]" : "border-[var(--color-muted)]"}`} />
                {r.label}
              </button>
            ))}
          </div>
          {error ? <p className="text-xs text-[var(--color-warn)]">{error}</p> : null}
          <div>
            <Label>
              Which firm won it? <span className="text-[var(--color-muted)]">(optional)</span>
            </Label>
            <Input value={competitor} onChange={(e) => setCompetitor(e.target.value)} />
          </div>
          <div>
            <Label>
              Revisit on <span className="text-[var(--color-muted)]">(optional)</span>
            </Label>
            <Input type="date" value={revisitDate} onChange={(e) => setRevisitDate(e.target.value)} />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">Creates a task to check back in, due on this date.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Mark as lost</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
