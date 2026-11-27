"use client";

import { useState, useTransition } from "react";
import { StageProgressBar } from "@/components/ui/stage-progress-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Round 3 item 8: "Remove the stage dropdown; change stage by clicking a
 * step on the progress bar (with confirm)." Shared by the opportunity and
 * mandate record headers — the last step (Won/Filled) is handled by its
 * own dedicated button instead, since that's a richer flow than a plain
 * stage flip (StageProgressBar already excludes it from being clickable).
 */
export function InteractiveStageBar({
  steps,
  currentIndex,
  days,
  onChangeStage,
  recordLabel,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
  days: Partial<Record<string, number>>;
  onChangeStage: (key: string) => Promise<unknown>;
  /** e.g. "opportunity" / "mandate" — used in the confirm copy. */
  recordLabel: string;
}) {
  const [pendingStep, setPendingStep] = useState<{ key: string; label: string } | null>(null);
  const [isPending, startTransition] = useTransition();

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
        title={`Move this ${recordLabel} to "${pendingStep?.label}"?`}
        confirmLabel="Change stage"
        pending={isPending}
        onCancel={() => setPendingStep(null)}
        onConfirm={() => {
          if (!pendingStep) return;
          startTransition(async () => {
            await onChangeStage(pendingStep.key);
            setPendingStep(null);
          });
        }}
      />
    </>
  );
}
