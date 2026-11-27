"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { label } from "@/lib/labels";
import { changeMandateStatusAction } from "./actions";
import { MandateStatusDialog } from "./mandate-status-dialog";
import { MarkSearchFilledDialog } from "./mark-search-filled-dialog";

const STATUSES = ["BRIEF_RECEIVED", "SEARCH_ACTIVE", "LONGLISTING", "SHORTLISTING", "INTERVIEWING", "OFFER", "FILLED", "CANCELLED", "ON_HOLD"];
const REASON_REQUIRED = new Set(["CANCELLED", "ON_HOLD"]);

/** Keyboard-accessible alternative to dragging a card on the status board. */
export function MandateStatusSelect({ mandateId, currentStatus }: { mandateId: string; currentStatus: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [fillOpen, setFillOpen] = useState(false);

  function handleChange(toStatus: string) {
    if (toStatus === currentStatus) return;
    // Matches the board's drag-to-Filled behaviour (mandate-board.tsx) — picking who got placed,
    // not a bare status flip, so the candidate-process record and placement fee stay in sync.
    if (toStatus === "FILLED") {
      setFillOpen(true);
      return;
    }
    if (REASON_REQUIRED.has(toStatus)) {
      setPendingStatus(toStatus);
      return;
    }
    startTransition(() => changeMandateStatusAction({ mandateId, toStatus }));
  }

  const isClosed = currentStatus === "FILLED" || currentStatus === "CANCELLED";

  return (
    <>
      {!isClosed ? (
        <>
          <Button variant="secondary" className="text-[var(--color-pos)]" onClick={() => handleChange("FILLED")}>
            Mark filled
          </Button>
          <Button variant="secondary" onClick={() => handleChange("ON_HOLD")}>
            On hold
          </Button>
        </>
      ) : null}
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
      <MarkSearchFilledDialog
        open={fillOpen}
        mandateId={fillOpen ? mandateId : null}
        onClose={() => setFillOpen(false)}
        onDone={() => {
          setFillOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
