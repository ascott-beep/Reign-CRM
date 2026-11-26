"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { label } from "@/lib/labels";

export function MandateStatusDialog({
  open,
  toStatus,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  toStatus: string | null;
  onCancel: () => void;
  onConfirm: (extra: { cancellationReason?: string; onHoldReason?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  if (!toStatus) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {label(toStatus)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>{toStatus === "CANCELLED" ? "Cancellation reason" : "On-hold reason"}</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(toStatus === "CANCELLED" ? { cancellationReason: reason } : { onHoldReason: reason });
              setReason("");
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
