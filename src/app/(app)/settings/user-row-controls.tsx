"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { setUserActiveAction, setUserRoleAction } from "./actions";
import { label } from "@/lib/labels";

export function UserRowControls({ userId, role, active, isSelf }: { userId: string; role: string; active: boolean; isSelf: boolean }) {
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
      <div className="flex items-center gap-1.5">
        <Switch checked={active} disabled={isSelf} onCheckedChange={(v) => startTransition(() => setUserActiveAction(userId, v))} />
        <span className="text-xs text-[var(--color-ink-subtle)]">{active ? "Active" : "Inactive"}</span>
      </div>
    </div>
  );
}
