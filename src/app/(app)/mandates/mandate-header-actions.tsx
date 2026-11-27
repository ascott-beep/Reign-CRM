"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Sparkles, CalendarClock, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shell/delete-dialog";
import { useAskAtlas } from "@/components/shell/ask-atlas/ask-atlas-provider";
import { changeMandateStatusAction } from "./actions";
import { MandateStatusDialog } from "./mandate-status-dialog";
import { MarkSearchFilledDialog } from "./mark-search-filled-dialog";
import { AddCandidateDialog, type CandidateOption } from "./add-candidate-dialog";

/**
 * Round 3 item 8: "Mandate: Add candidate (primary), Mark filled, ...
 * (On hold, Edit, Ask, Delete)." The old status dropdown is gone (stage
 * changes happen on the progress bar now — see InteractiveStageBar).
 */
export function MandateHeaderActions({
  mandateId,
  mandateTitle,
  orgName,
  currentStatus,
  candidates,
  recordName,
  editHref,
  listHref,
  isAdmin,
}: {
  mandateId: string;
  mandateTitle: string;
  orgName: string;
  currentStatus: string;
  candidates: CandidateOption[];
  recordName: string;
  editHref: string;
  listHref: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const askAtlas = useAskAtlas();
  const [, startTransition] = useTransition();
  const [pendingHold, setPendingHold] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isClosed = currentStatus === "FILLED" || currentStatus === "CANCELLED";

  return (
    <>
      {!isClosed ? <AddCandidateDialog mandateId={mandateId} mandateTitle={mandateTitle} orgName={orgName} candidates={candidates} /> : null}
      {!isClosed ? (
        <Button variant="secondary" className="text-[var(--color-pos)]" onClick={() => setFillOpen(true)}>
          Mark filled
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
          {!isClosed ? (
            <DropdownMenuItem onSelect={() => setPendingHold(true)}>
              <CalendarClock className="h-3.5 w-3.5" /> On hold
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => askAtlas.open({ recordContext: `The user is viewing the mandate "${recordName}" in Atlas.`, suggestedPrompts: ["Summarise", "What's the latest", "Who could fit this role"] })}>
            <Sparkles className="h-3.5 w-3.5" /> Ask
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-[var(--color-warn)]">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <MandateStatusDialog
        open={pendingHold}
        toStatus={pendingHold ? "ON_HOLD" : null}
        onCancel={() => setPendingHold(false)}
        onConfirm={(extra) => {
          startTransition(() => changeMandateStatusAction({ mandateId, toStatus: "ON_HOLD", ...extra }));
          setPendingHold(false);
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
      {deleteOpen ? <DeleteDialog type="MANDATE" id={mandateId} listHref={listHref} onClose={() => setDeleteOpen(false)} /> : null}
    </>
  );
}
