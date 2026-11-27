"use client";

import { useState, useTransition } from "react";
import { StageProgressBar } from "@/components/ui/stage-progress-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/shell/toast-provider";

/**
 * Round 3 item 8: "Remove the stage dropdown; change stage by clicking a
 * step on the progress bar (with confirm)." Shared by the opportunity and
 * mandate record headers — the last step (Won/Filled) is handled by its
 * own dedicated button instead, since that's a richer flow than a plain
 * stage flip (StageProgressBar already excludes it from being clickable).
 * Round 4 screen 20 (DlgR4Stage): from/to tags, an optional note logged
 * with the stage change, and a confirm button named after the target stage.
 */
export function InteractiveStageBar({
  steps,
  currentIndex,
  days,
  onChangeStage,
  recordName,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
  days: Partial<Record<string, number>>;
  onChangeStage: (key: string, note?: string) => Promise<unknown>;
  /** e.g. "Chief Financial Officer · Vantage Logistics Group" — shown under the dialog title. */
  recordName: string;
}) {
  const [pendingStep, setPendingStep] = useState<{ key: string; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const fromStep = steps[currentIndex];

  return (
    <>
      <StageProgressBar
        steps={steps}
        currentIndex={currentIndex}
        days={days}
        onStepClick={(key, index) => {
          const step = steps[index];
          if (step) setPendingStep(step);
        }}
      />
      <ConfirmDialog
        open={pendingStep !== null}
        title={`Move to ${pendingStep?.label}?`}
        description={recordName}
        confirmLabel={`Move to ${pendingStep?.label}`}
        pending={isPending}
        onCancel={() => {
          setPendingStep(null);
          setNote("");
        }}
        onConfirm={() => {
          if (!pendingStep) return;
          const toLabel = pendingStep.label;
          const noteToLog = note.trim() || undefined;
          startTransition(async () => {
            await onChangeStage(pendingStep.key, noteToLog);
            setPendingStep(null);
            setNote("");
            showToast({
              kind: "undo",
              title: `Moved to ${toLabel}`,
              actionLabel: fromStep ? "Undo" : undefined,
              onAction: fromStep ? () => onChangeStage(fromStep.key) : undefined,
            });
          });
        }}
      >
        {pendingStep ? (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{fromStep?.label}</Badge>
              <span className="text-[var(--color-muted)]">→</span>
              <Badge tone="info">{pendingStep.label}</Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-change-note">Note (optional)</Label>
              <Textarea
                id="stage-change-note"
                rows={2}
                placeholder="e.g. Client wants first interviews next week"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-[var(--color-ink-subtle)]">Logged in History with the stage change.</p>
            </div>
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
