"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordAction, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = {};

export function SetPasswordForm({ token, purpose, firstName }: { token: string; purpose: "invite" | "reset"; firstName: string }) {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      <div>
        <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">
          {purpose === "invite" ? `Welcome, ${firstName}` : "Set a new password"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {purpose === "invite" ? "Set a password to get started." : "Choose a new password for your account."}
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="purpose" value={purpose} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        {state.error ? (
          <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1 h-[46px]">
          {pending ? "Saving…" : purpose === "invite" ? "Set password & sign in" : "Save & sign in"}
        </Button>
      </form>
    </div>
  );
}
