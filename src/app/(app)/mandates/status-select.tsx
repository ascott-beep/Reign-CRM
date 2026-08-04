"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { changeMandateStatusAction } from "./actions";
import { MandateStatusDialog } from "./mandate-status-dialog";

const STATUSES = ["BRIEF_RECEIVED", "SEARCH_ACTIVE", "LONGLISTING", "SHORTLISTING", "INTERVIEWING", "OFFER", "FILLED", "CANCELLED", "ON_HOLD"];
const REASON_REQUIRED = new Set(["CANCELLED", "ON_HOLD"]);

/** Keyboard-accessible alternative to dragging a card on the status board. */
export function MandateStatusSelect({ mandateId, currentStatus }: { mandateId: string; currentStatus: string }) {
  const [, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  function handleChange(toStatus: string) {
    if (toStatus === currentStatus) return;
    if (REASON_REQUIRED.has(toStatus)) {
      setPendingStatus(toStatus);
      return;
    }
    startTransition(() => changeMandateStatusAction({ mandateId, toStatus }));
  }

  return (
    <>
      <Select value={currentStatus} onValueChange={handleChange}>
        <SelectTrigger aria-label="Change mandate status" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <MandateStatusDialog
        open={pendingStatus !== null}
        toStatus={pendingStatus}
        onCancel={() => setPendingStatus(null)}
        onConfirm={(extra) => {
          if (pendingStatus) startTransition(() => changeMandateStatusAction({ mandateId, toStatus: pendingStatus, ...extra }));
          setPendingStatus(null);
        }}
      />
    </>
  );
}
