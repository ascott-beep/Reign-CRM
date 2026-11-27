"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      {state.sent ? (
        <>
          <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Check your email</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            If an account exists for that address, we&apos;ve sent a link to reset the password. It lasts 1 hour.
          </p>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Reset your password</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Enter your work email and we&apos;ll send you a reset link.</p>
          </div>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required placeholder="e.g. jamie@reign.partners" />
            </div>
            {state.error ? (
              <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">{state.error}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="mt-1 h-[46px]">
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <Link href="/login" className="text-center text-[12.5px] text-[var(--color-ink-subtle)] no-underline hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
