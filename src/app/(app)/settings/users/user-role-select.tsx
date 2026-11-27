"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/shell/toast-provider";
import { ROLE_SHORT_LABEL } from "@/lib/labels";
import { setUserRoleAction } from "../actions";

const ROLES = ["ADMIN", "STANDARD", "READ_ONLY"] as const;

/** Round 4 screen 35 (R4SetUsers) — "Role is changed inline." */
export function UserRoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(role);
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <Select
      value={value}
      disabled={disabled || pending}
      onValueChange={(next) =>
        startTransition(async () => {
          const previous = value;
          setValue(next);
          try {
            await setUserRoleAction(userId, next);
            router.refresh();
          } catch (e) {
            setValue(previous);
            showToast({ kind: "error", title: "Couldn't change role", body: e instanceof Error ? e.message : undefined });
          }
        })
      }
    >
      <SelectTrigger className="h-8 w-[140px] text-[13px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_SHORT_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
