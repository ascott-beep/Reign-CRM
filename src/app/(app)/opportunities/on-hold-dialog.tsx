"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const QUICK_PICKS = [
  { label: "In 2 weeks", days: 14 },
  { label: "In 1 month", days: 30 },
  { label: "In 3 months", days: 90 },
];

export type OnHoldResult = { onHoldReason?: string; holdReviewDate: string };

/** d06 "Put this on hold" */
export function OnHoldDialog({
  open,
  context,
  ownerName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** e.g. "Head of Tax · Oakfield Professional Services" */
  context?: string;
  ownerName?: string;
  onCancel: () => void;
  onConfirm: (result: OnHoldResult) => void;
}) {
  const [reviewDate, setReviewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function pick(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setReviewDate(d.toISOString().slice(0, 10));
  }

  function reset() {
    setReason("");
    setError(null);
  }

  function handleConfirm() {
    if (!reviewDate) {
      setError("A review date is required.");
      return;
    }
    onConfirm({ onHoldReason: reason || undefined, holdReviewDate: reviewDate });
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
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Put this on hold</DialogTitle>
          {context ? <DialogDescription>{context}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-[18px] py-1">
          <div>
            <Label htmlFor="reviewDate">Review it on</Label>
            <Input id="reviewDate" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          </div>
          <div className="-mt-2 flex flex-wrap gap-2">
            {QUICK_PICKS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => pick(p.days)}
                className="h-[30px] rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-3 text-[13px] text-[var(--color-ink2)]"
              >
                {p.label}
              </button>
            ))}
          </div>
          {error ? <p className="text-xs text-[var(--color-warn)]">{error}</p> : null}
          <div>
            <Label>Why is it on hold?</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex items-start gap-2.5 rounded-[6px] bg-[var(--color-chip-strong)] px-3.5 py-3 text-[13.5px] leading-relaxed text-[var(--color-chip-strong-ink)]">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>
              A task to review this will be added{ownerName ? ` for ${ownerName}` : ""} on the review date. The card moves to the Closed tray until then.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Put on hold</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
