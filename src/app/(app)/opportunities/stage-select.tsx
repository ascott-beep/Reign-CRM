"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { changeOpportunityStageAction } from "./actions";
import { StageChangeDialog } from "./stage-change-dialog";
import { useState } from "react";

const STAGES = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS", "WON", "LOST", "ON_HOLD"];
const TERMINAL_STAGES = new Set(["WON", "LOST", "ON_HOLD"]);

/**
 * Keyboard-accessible alternative to dragging a card between kanban
 * columns — same server action, same required-field dialog for
 * Won/Lost/On Hold.
 */
export function StageSelect({ opportunityId, currentStage }: { opportunityId: string; currentStage: string }) {
  const [, startTransition] = useTransition();
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  function handleChange(toStage: string) {
    if (toStage === currentStage) return;
    if (TERMINAL_STAGES.has(toStage)) {
      setPendingStage(toStage);
      return;
    }
    startTransition(() => changeOpportunityStageAction({ opportunityId, toStage }));
  }

  return (
    <>
      <Select value={currentStage} onValueChange={handleChange}>
        <SelectTrigger aria-label="Change opportunity stage" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {label(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StageChangeDialog
        open={pendingStage !== null}
        toStage={pendingStage}
        onCancel={() => setPendingStage(null)}
        onConfirm={(extra) => {
          if (pendingStage) startTransition(() => changeOpportunityStageAction({ opportunityId, toStage: pendingStage, ...extra }));
          setPendingStage(null);
        }}
      />
    </>
  );
}
