"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { changeOpportunityStageAction } from "./actions";
import { LostReasonDialog, type LostReasonResult } from "./lost-reason-dialog";
import { OnHoldDialog, type OnHoldResult } from "./on-hold-dialog";
import { CreateMandateDialog } from "./create-mandate-dialog";

const STAGES = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS", "WON", "LOST", "ON_HOLD"];

/**
 * Keyboard-accessible alternative to dragging a card between kanban
 * columns — same server action, same dialogs (d01/d05/d06) as the board.
 */
export function StageSelect({ opportunityId, currentStage, context }: { opportunityId: string; currentStage: string; context?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingLost, setPendingLost] = useState(false);
  const [pendingHold, setPendingHold] = useState(false);
  const [pendingWon, setPendingWon] = useState(false);

  function handleChange(toStage: string) {
    if (toStage === currentStage) return;
    if (toStage === "LOST") {
      setPendingLost(true);
      return;
    }
    if (toStage === "ON_HOLD") {
      setPendingHold(true);
      return;
    }
    if (toStage === "WON") {
      startTransition(async () => {
        await changeOpportunityStageAction({ opportunityId, toStage });
        setPendingWon(true);
      });
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
      <LostReasonDialog
        open={pendingLost}
        context={context}
        onCancel={() => setPendingLost(false)}
        onConfirm={(result: LostReasonResult) => {
          startTransition(() => changeOpportunityStageAction({ opportunityId, toStage: "LOST", ...result }));
          setPendingLost(false);
        }}
      />
      <OnHoldDialog
        open={pendingHold}
        context={context}
        onCancel={() => setPendingHold(false)}
        onConfirm={(result: OnHoldResult) => {
          startTransition(() => changeOpportunityStageAction({ opportunityId, toStage: "ON_HOLD", ...result }));
          setPendingHold(false);
        }}
      />
      <CreateMandateDialog
        open={pendingWon}
        opportunityId={pendingWon ? opportunityId : null}
        onClose={() => {
          setPendingWon(false);
          router.refresh();
        }}
      />
    </>
  );
}
