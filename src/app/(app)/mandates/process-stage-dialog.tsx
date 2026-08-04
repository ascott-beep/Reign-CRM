"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";

const REJECTION_REASONS = [
  "FUNCTIONAL_FIT",
  "SECTOR_FIT",
  "PE_EXPERIENCE",
  "SENIORITY",
  "COMPENSATION",
  "LOCATION",
  "AVAILABILITY",
  "CULTURAL_FIT",
  "CLIENT_PREFERENCE",
  "ROLE_CHANGED",
  "NO_RESPONSE",
  "OTHER",
];
const WITHDRAWAL_REASONS = [
  "ACCEPTED_OTHER_ROLE",
  "COUNTEROFFER",
  "COMPENSATION",
  "LOCATION",
  "TIMING",
  "LOST_INTEREST",
  "PERSONAL_CIRCUMSTANCES",
  "CONCERNS_ABOUT_COMPANY",
  "OTHER",
];

export function ProcessStageDialog({
  open,
  toStage,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  toStage: string | null;
  onCancel: () => void;
  onConfirm: (extra: { rejectionReason?: string; rejectionExplanation?: string; withdrawalReason?: string; withdrawalExplanation?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!toStage || (toStage !== "REJECTED" && toStage !== "WITHDRAWN")) return null;

  function handleConfirm() {
    if (!reason) {
      setError(`A ${toStage === "REJECTED" ? "rejection" : "withdrawal"} reason is required.`);
      return;
    }
    onConfirm(
      toStage === "REJECTED"
        ? { rejectionReason: reason, rejectionExplanation: explanation }
        : { withdrawalReason: reason, withdrawalExplanation: explanation },
    );
    setReason("");
    setExplanation("");
    setError(null);
  }

  const reasons = toStage === "REJECTED" ? REJECTION_REASONS : WITHDRAWAL_REASONS;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {label(toStage)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
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
            <Textarea rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
        </div>
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
