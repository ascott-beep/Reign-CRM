"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";

const LOSS_REASONS = [
  "NO_REQUIREMENT",
  "TIMING",
  "INTERNAL_HIRE",
  "EXISTING_SUPPLIER",
  "COMPETITOR_SELECTED",
  "TERMS_OR_FEE",
  "ROLE_CANCELLED",
  "NO_RESPONSE",
  "OUTSIDE_SCOPE",
  "OTHER",
];

export function StageChangeDialog({
  open,
  toStage,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  toStage: string | null;
  onCancel: () => void;
  onConfirm: (extra: { lossReason?: string; lossExplanation?: string; onHoldReason?: string }) => void;
}) {
  const [lossReason, setLossReason] = useState("");
  const [lossExplanation, setLossExplanation] = useState("");
  const [onHoldReason, setOnHoldReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!toStage) return null;

  function handleConfirm() {
    if (toStage === "LOST" && !lossReason) {
      setError("A loss reason is required.");
      return;
    }
    onConfirm({ lossReason, lossExplanation, onHoldReason });
    setLossReason("");
    setLossExplanation("");
    setOnHoldReason("");
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {label(toStage)}</DialogTitle>
        </DialogHeader>
        {toStage === "LOST" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Loss reason</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {label(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error ? <p className="text-xs text-[var(--color-status-danger-ink)]">{error}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Explanation (optional)</Label>
              <Textarea rows={3} value={lossExplanation} onChange={(e) => setLossExplanation(e.target.value)} />
            </div>
          </div>
        ) : toStage === "ON_HOLD" ? (
          <div className="flex flex-col gap-1.5">
            <Label>On-hold reason</Label>
            <Textarea rows={3} value={onHoldReason} onChange={(e) => setOnHoldReason(e.target.value)} />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-subtle)]">Confirm moving this opportunity to {label(toStage)}.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
