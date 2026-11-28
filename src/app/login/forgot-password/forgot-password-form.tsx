"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};
const RESEND_COOLDOWN_SECONDS = 60;

/** Round 4 screen 44 (R4AuthSent): resend limited to once a minute, the link reads "Sent again" after pressing it. */
function CheckYourEmail({ email, formAction }: { email: string; formAction: (payload: FormData) => void }) {
  const [cooldown, setCooldown] = useState(0);
  const [sentAgain, setSentAgain] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  return (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ai-bg)] text-[var(--color-ai-icon)]">
        <Mail className="h-[18px] w-[18px]" />
      </span>
      <div>
        <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Check your email</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          If <span className="font-medium text-[var(--color-ink)]">{email}</span> has an Atlas account, a reset link is on its way. It works for 1 hour.
        </p>
      </div>
      <form
        action={(fd) => {
          formAction(fd);
          setCooldown(RESEND_COOLDOWN_SECONDS);
          setSentAgain(true);
        }}
      >
        <input type="hidden" name="email" value={email} />
        <p className="text-sm text-[var(--color-ink-muted)]">
          No email after a few minutes? Check spam or{" "}
          {cooldown > 0 ? (
            <span className="text-[var(--color-ink-subtle)]">{sentAgain ? "sent again" : "send it again"}</span>
          ) : (
            <button type="submit" className="font-medium text-[var(--color-ink)] underline">
              send it again
            </button>
          )}
          .
        </p>
      </form>
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      {state.sent && state.email ? (
        <CheckYourEmail email={state.email} formAction={formAction} />
      ) : (
        <>
          <div>
            <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">Reset your password</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Enter your work email and we&apos;ll send you a link.</p>
          </div>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
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
