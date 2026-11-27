"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  setUserActiveAction,
  setUserRoleAction,
  resendInviteAction,
  cancelInviteAction,
  sendPasswordResetToUserAction,
  reassignOpenWorkAction,
} from "./actions";
import { ROLE_SHORT_LABEL } from "@/lib/labels";

const ROLES = ["ADMIN", "STANDARD", "READ_ONLY"] as const;

type OtherUser = { id: string; firstName: string; lastName: string };

/** Section 9.5 / screen 12 — the "⋯" row menu; role and active state are display-only outside it. */
export function UserRowMenu({
  userId,
  role,
  active,
  isSelf,
  hasPassword,
  otherActiveUsers,
}: {
  userId: string;
  role: string;
  active: boolean;
  isSelf: boolean;
  hasPassword: boolean;
  otherActiveUsers: OtherUser[];
}) {
  const [, startTransition] = useTransition();
  const [reassignOpen, setReassignOpen] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User actions"
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--color-ink2)] hover:bg-[var(--color-canvas)]"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ROLES.map((r) => (
              <DropdownMenuItem key={r} onSelect={() => startTransition(() => setUserRoleAction(userId, r))}>
                <span className="flex w-3.5 items-center justify-center">{r === role ? <Check className="h-3.5 w-3.5" /> : null}</span>
                {ROLE_SHORT_LABEL[r]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {!hasPassword ? (
          <>
            <DropdownMenuItem onSelect={() => startTransition(() => resendInviteAction(userId))}>Resend invite</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => startTransition(() => cancelInviteAction(userId))} className="text-[var(--color-warn)]">
              Cancel invite
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => startTransition(() => sendPasswordResetToUserAction(userId))}>Send password reset</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSelf && active}
              onSelect={() => startTransition(() => setUserActiveAction(userId, !active))}
              className={active ? "text-[var(--color-warn)]" : undefined}
            >
              {active ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={otherActiveUsers.length === 0}
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => setReassignOpen(true), 0);
              }}
            >
              Reassign open work
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      <ReassignWorkDialog userId={userId} open={reassignOpen} onOpenChange={setReassignOpen} otherActiveUsers={otherActiveUsers} />
    </DropdownMenu>
  );
}

function ReassignWorkDialog({
  userId,
  open,
  onOpenChange,
  otherActiveUsers,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherActiveUsers: OtherUser[];
}) {
  const [targetId, setTargetId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setTargetId("");
      setResult(null);
    }
  }

  async function handleReassign() {
    if (!targetId) return;
    setPending(true);
    const counts = await reassignOpenWorkAction(userId, targetId);
    const total = counts.opportunities + counts.mandates + counts.tasks + counts.candidateProcesses;
    setResult(total === 0 ? "Nothing open to reassign — this person has no open work." : `Reassigned ${total} open item${total === 1 ? "" : "s"}.`);
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign open work</DialogTitle>
        </DialogHeader>
        {result ? (
          <>
            <p className="text-sm text-[var(--color-ink2)]">{result}</p>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--color-ink2)]">
              Moves every open opportunity, mandate, task and candidate process this person owns onto someone else. Closed and archived work stays as it is.
            </p>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                {otherActiveUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button disabled={!targetId || pending} onClick={handleReassign}>
                {pending ? "Reassigning…" : "Reassign"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
