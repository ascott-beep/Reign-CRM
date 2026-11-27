"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButtonGroup } from "@/components/brand/oauth-button";
import { loginAction, type LoginState } from "./actions";
import { loginErrorMessage } from "./error-message";

const initialState: LoginState = {};

/** Round 4 screen 46 note: on Sign in, Google/Microsoft stay BELOW the email/password form (the opposite order to Accept invite, where there's no password yet). */
export function LoginForm({ providers, error }: { providers: { google: boolean; microsoft: boolean }; error?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const errorMessage = state.error ?? loginErrorMessage(error);
  const showOAuth = providers.google || providers.microsoft;

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/login/forgot-password" className="text-[12.5px] text-[var(--color-ink-subtle)] no-underline hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {errorMessage ? (
          <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1 h-[46px]">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {showOAuth ? (
        <div className="flex items-center gap-3.5 text-[12.5px] text-[var(--color-ink-subtle)]">
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
          or
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        </div>
      ) : null}
      <OAuthButtonGroup providers={providers} />
    </div>
  );
}
