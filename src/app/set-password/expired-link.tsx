"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestNewInviteAction } from "./actions";

/** Round 4 screen 47 (R4AuthExpired) — shared by expired reset links and expired invite links. */
export function ExpiredLink({ token, inviterName }: { token?: string; inviterName: string | null }) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-[400px] flex-col gap-4 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
      <div>
        <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">This link has expired</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Reset links last 1 hour and invites last 7 days. Ask for a new one below.</p>
      </div>
      {inviterName && token ? (
        <Button
          type="button"
          disabled={pending || sent}
          className="mt-1 h-[46px]"
          onClick={() => startTransition(async () => {
            const result = await requestNewInviteAction(token);
            setSent(result.sent);
          })}
        >
          {sent ? "Sent" : pending ? "Sending…" : `Ask ${inviterName} for a new invite`}
        </Button>
      ) : (
        <Button asChild className="mt-1 h-[46px]">
          <Link href="/login/forgot-password">Send a new link</Link>
        </Button>
      )}
      <Link href="/login" className="text-center text-[12.5px] text-[var(--color-ink-subtle)] no-underline hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
