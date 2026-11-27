"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Sparkles, CalendarClock, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shell/delete-dialog";
import { useAskAtlas } from "@/components/shell/ask-atlas/ask-atlas-provider";
import { changeOpportunityStageAction } from "./actions";
import { LostReasonDialog, type LostReasonResult } from "./lost-reason-dialog";
import { OnHoldDialog, type OnHoldResult } from "./on-hold-dialog";
import { CreateMandateDialog } from "./create-mandate-dialog";

/**
 * Round 3 item 8: "Opportunity header: Won (primary), Lost, (dots)." The old
 * stage dropdown is gone (stage changes happen on the progress bar now —
 * see InteractiveStageBar); this holds just the two outcome buttons plus a
 * "..." menu for On hold / Edit / Ask / Delete. Only rendered for an
 * opportunity that isn't already Won-and-linked-to-a-mandate — the caller
 * (the record page) shows "View live search ->" instead for that case.
 */
export function OpportunityHeaderActions({
  opportunityId,
  currentStage,
  context,
  recordName,
  editHref,
  listHref,
  isAdmin,
}: {
  opportunityId: string;
  currentStage: string;
  context?: string;
  recordName: string;
  editHref: string;
  listHref: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const askAtlas = useAskAtlas();
  const [, startTransition] = useTransition();
  const [pendingLost, setPendingLost] = useState(false);
  const [pendingHold, setPendingHold] = useState(false);
  const [pendingWon, setPendingWon] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isLost = currentStage === "LOST";
  const isWonUnconverted = currentStage === "WON";
  const isOpen = !isLost && !isWonUnconverted;

  function handleWon() {
    startTransition(async () => {
      await changeOpportunityStageAction({ opportunityId, toStage: "WON" });
      setPendingWon(true);
    });
  }

  return (
    <>
      {isWonUnconverted ? (
        <Button onClick={() => setPendingWon(true)}>Convert to mandate</Button>
      ) : isOpen ? (
        <Button className="text-[var(--color-pos)]" variant="secondary" onClick={handleWon}>
          Won
        </Button>
      ) : null}
      {isOpen ? (
        <Button variant="secondary" className="text-[var(--color-warn)]" onClick={() => setPendingLost(true)}>
          Lost
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink)]"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOpen ? (
            <DropdownMenuItem onSelect={() => setPendingHold(true)}>
              <CalendarClock className="h-3.5 w-3.5" /> On hold
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => askAtlas.open({ recordContext: `The user is viewing the opportunity "${recordName}" in Atlas.`, suggestedPrompts: ["Summarise", "What's the latest", "Who could fit this role"] })}>
            <Sparkles className="h-3.5 w-3.5" /> Ask
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-[var(--color-warn)]">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

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
      {deleteOpen ? <DeleteDialog type="OPPORTUNITY" id={opportunityId} listHref={listHref} onClose={() => setDeleteOpen(false)} /> : null}
    </>
  );
}
