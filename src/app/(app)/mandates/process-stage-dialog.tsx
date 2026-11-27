"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

const OUTCOMES = [
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "ON_HOLD", label: "On hold" },
] as const;

const DECIDERS = [
  { value: "Client", label: "Client" },
  { value: "Candidate", label: "Candidate" },
  { value: "Reign", label: "Reign" },
] as const;

// A short, plain-language set shown as tags, mapped onto the existing
// ProcessRejectionReason / WithdrawalReason enums behind the scenes.
const REJECTION_REASON_TAGS: { value: string; label: string }[] = [
  { value: "FUNCTIONAL_FIT", label: "Experience gap" },
  { value: "COMPENSATION", label: "Salary expectations" },
  { value: "CULTURAL_FIT", label: "Culture fit" },
  { value: "CLIENT_PREFERENCE", label: "Client preference" },
  { value: "LOCATION", label: "Location" },
  { value: "OTHER", label: "Other" },
];
const WITHDRAWAL_REASON_TAGS: { value: string; label: string }[] = [
  { value: "ACCEPTED_OTHER_ROLE", label: "Accepted another role" },
  { value: "COMPENSATION", label: "Salary expectations" },
  { value: "LOCATION", label: "Location" },
  { value: "LOST_INTEREST", label: "Lost interest" },
  { value: "PERSONAL_CIRCUMSTANCES", label: "Personal circumstances" },
  { value: "OTHER", label: "Other" },
];

export type ProcessStageDialogResult = {
  toStage: "REJECTED" | "WITHDRAWN" | "ON_HOLD";
  rejectionReason?: string;
  rejectionExplanation?: string;
  withdrawalReason?: string;
  withdrawalExplanation?: string;
  exitDecidedBy?: string;
};

/** d04 "Take candidate off search". */
export function ProcessStageDialog({
  open,
  candidateFirstName,
  context,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** First name only, for "Take <name> off this search" / "Keep <name> in mind". */
  candidateFirstName?: string;
  /** e.g. "Final interview · Chief Financial Officer, Vantage Logistics Group" */
  context?: string;
  onCancel: () => void;
  onConfirm: (result: ProcessStageDialogResult) => void;
}) {
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]["value"]>("REJECTED");
  const [decidedBy, setDecidedBy] = useState<(typeof DECIDERS)[number]["value"]>("Client");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [keepInMind, setKeepInMind] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reasonTags = outcome === "REJECTED" ? REJECTION_REASON_TAGS : outcome === "WITHDRAWN" ? WITHDRAWAL_REASON_TAGS : null;
  const name = candidateFirstName ?? "this candidate";

  function reset() {
    setOutcome("REJECTED");
    setDecidedBy("Client");
    setReason("");
    setNote("");
    setKeepInMind(false);
    setError(null);
  }

  function handleConfirm() {
    if (reasonTags && !reason) {
      setError("A reason is required.");
      return;
    }
    const explanation = keepInMind ? `${note ? `${note} ` : ""}(Keep in mind for future searches.)` : note;
    onConfirm({
      toStage: outcome,
      exitDecidedBy: decidedBy,
      ...(outcome === "REJECTED" ? { rejectionReason: reason, rejectionExplanation: explanation } : {}),
      ...(outcome === "WITHDRAWN" ? { withdrawalReason: reason, withdrawalExplanation: explanation } : {}),
    });
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
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Take {name} off this search</DialogTitle>
          {context ? <DialogDescription>{context}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-[18px] py-1">
          <div>
            <Label>Outcome</Label>
            <SegmentedToggle
              options={OUTCOMES}
              value={outcome}
              onChange={(v) => {
                setOutcome(v);
                setReason("");
                setError(null);
              }}
            />
          </div>
          <div>
            <Label>Who decided</Label>
            <SegmentedToggle options={DECIDERS} value={decidedBy} onChange={setDecidedBy} />
          </div>
          {reasonTags ? (
            <div>
              <Label>Reason</Label>
              <div className="flex flex-wrap gap-2">
                {reasonTags.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={reason === r.value}
                    onClick={() => setReason(r.value)}
                    className={
                      reason === r.value
                        ? "h-7 rounded-control border border-[var(--color-navy)] bg-[var(--color-navy)] px-3 text-[13px] text-[var(--color-navy-ink)]"
                        : "h-7 rounded-control border border-[var(--color-line)] bg-[var(--color-card)] px-3 text-[13px] text-[var(--color-ink2)]"
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {error ? <p className="mt-1.5 text-xs text-[var(--color-warn)]">{error}</p> : null}
            </div>
          ) : null}
          <div>
            <Label>Note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-ink)]">
            <Checkbox checked={keepInMind} onCheckedChange={(v) => setKeepInMind(v === true)} />
            Keep {name} in mind for future searches
          </label>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Take off this search</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
