"use client";

import { GoogleIcon, MicrosoftIcon } from "@/components/brand/oauth-icons";
import { signInWithProviderAction } from "@/app/login/actions";

/** Shared Google/Microsoft sign-in button — used on the sign-in page (below the form) and the accept-invite page (above the form, screen 46). */
export function OAuthButton({ provider, label }: { provider: "google" | "microsoft-entra-id"; label: string }) {
  const icon = provider === "google" ? <GoogleIcon className="h-[18px] w-[18px]" /> : <MicrosoftIcon className="h-[18px] w-[18px]" />;
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

export function OAuthButtonGroup({ providers }: { providers: { google: boolean; microsoft: boolean } }) {
  if (!providers.google && !providers.microsoft) return null;
  return (
    <div className="flex flex-col gap-3">
      {providers.google ? <OAuthButton provider="google" label="Continue with Google" /> : null}
      {providers.microsoft ? <OAuthButton provider="microsoft-entra-id" label="Continue with Microsoft" /> : null}
    </div>
  );
}
