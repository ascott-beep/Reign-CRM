"use client";

import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setUserActiveAction, setUserRoleAction, resendInviteAction, cancelInviteAction, sendPasswordResetToUserAction } from "./actions";
import { label } from "@/lib/labels";

export function UserRowControls({
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
    <div className="flex items-center gap-3">
      <Select defaultValue={role} onValueChange={(v) => startTransition(() => setUserRoleAction(userId, v))}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMIN">{label("ADMIN")}</SelectItem>
          <SelectItem value="STANDARD">{label("STANDARD")}</SelectItem>
          <SelectItem value="READ_ONLY">{label("READ_ONLY")}</SelectItem>
        </SelectContent>
      </Select>
      {!hasPassword ? (
        <span className="text-xs text-[var(--color-ink-subtle)]">Invited</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <Switch checked={active} disabled={isSelf} onCheckedChange={(v) => startTransition(() => setUserActiveAction(userId, v))} />
          <span className="text-xs text-[var(--color-ink-subtle)]">{active ? "Active" : "Inactive"}</span>
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink2)] hover:bg-[var(--color-canvas)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!hasPassword ? (
            <>
              <DropdownMenuItem onSelect={() => startTransition(() => resendInviteAction(userId))}>Resend invite</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startTransition(() => cancelInviteAction(userId))} className="text-[var(--color-warn)]">
                Cancel invite
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => startTransition(() => sendPasswordResetToUserAction(userId))}>Send password reset</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
