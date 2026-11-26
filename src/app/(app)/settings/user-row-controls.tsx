"use client";

import { useTransition } from "react";
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
import { setUserActiveAction, setUserRoleAction, resendInviteAction, cancelInviteAction, sendPasswordResetToUserAction } from "./actions";
import { ROLE_SHORT_LABEL } from "@/lib/labels";

const ROLES = ["ADMIN", "STANDARD", "READ_ONLY"] as const;

/** Section 9.5 / screen 12 — the "⋯" row menu; role and active state are display-only outside it. */
export function UserRowMenu({
  userId,
  role,
  active,
  isSelf,
  hasPassword,
}: {
  userId: string;
  role: string;
  active: boolean;
  isSelf: boolean;
  hasPassword: boolean;
}) {
  const [, startTransition] = useTransition();

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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
