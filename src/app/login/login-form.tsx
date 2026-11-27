"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon, MicrosoftIcon } from "@/components/brand/oauth-icons";
import { loginAction, signInWithProviderAction, type LoginState } from "./actions";
import { loginErrorMessage } from "./error-message";

const initialState: LoginState = {};

function OAuthButton({ provider, icon, label }: { provider: "google" | "microsoft-entra-id"; icon: React.ReactNode; label: string }) {
  return (
    <form action={() => signInWithProviderAction(provider)}>
      <button
        type="submit"
        className="relative flex h-12 w-full items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[14.5px] font-medium text-[var(--color-ink)] shadow-sm"
      >
        <span aria-hidden className="absolute left-[7px] top-[7px] flex h-8 w-8 items-center justify-center rounded-[5px] bg-[var(--color-bg)]">
          {icon}
        </span>
        {label}
      </button>
    </form>
  );
}

export function LoginForm({ providers, error }: { providers: { google: boolean; microsoft: boolean }; error?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const errorMessage = state.error ?? loginErrorMessage(error);
  const showOAuth = providers.google || providers.microsoft;

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      {providers.google ? <OAuthButton provider="google" icon={<GoogleIcon className="h-[18px] w-[18px]" />} label="Continue with Google" /> : null}
      {providers.microsoft ? <OAuthButton provider="microsoft-entra-id" icon={<MicrosoftIcon className="h-[18px] w-[18px]" />} label="Continue with Microsoft" /> : null}
      {showOAuth ? (
        <div className="flex items-center gap-3.5 text-[12.5px] text-[var(--color-ink-subtle)]">
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
          or
          <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
        </div>
      ) : null}
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
    </div>
  );
}
