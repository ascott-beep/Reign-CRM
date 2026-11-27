"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addNeverSyncAddressAction, removeNeverSyncAddressAction } from "./actions";

/**
 * Round 4 screen 33 (R4SetConnections), "What gets logged" group. The two
 * switches describe real, fixed behaviour (every matched email is logged;
 * logged emails are public by default, with a per-email private toggle
 * already available from the activity itself) rather than a saved
 * preference -- there's no schema field to back a workspace-wide default
 * for either yet, so they're shown disabled rather than faking a setting
 * that wouldn't do anything. "Skip these addresses" is the one real,
 * working control here (the existing per-user never-sync list).
 */
export function WhatGetsLoggedCard({ addresses, hasAnyConnection }: { addresses: { id: string; emailAddress: string }[]; hasAnyConnection: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingAddresses, setEditingAddresses] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm text-[var(--color-ink)]">Log emails with contacts and candidates</p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">Subject and first lines show on the record. Full email opens in Outlook or Gmail.</p>
        </div>
        <Switch checked disabled />
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm text-[var(--color-ink)]">Mark logged emails private by default</p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">Only you can read them. Others see that an email happened. Can be set per email too.</p>
        </div>
        <Switch disabled />
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-ink)]">Skip these addresses</p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
              {addresses.length > 0 ? addresses.map((a) => a.emailAddress).join(", ") : "None skipped."}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEditingAddresses((v) => !v)} disabled={!hasAnyConnection}>
            Edit
          </Button>
        </div>
        {editingAddresses ? (
          <div className="mt-3">
            <form
              ref={formRef}
              action={(formData) =>
                startTransition(async () => {
                  await addNeverSyncAddressAction(formData);
                  formRef.current?.reset();
                  router.refresh();
                })
              }
              className="flex gap-2"
            >
              <Input name="emailAddress" type="email" placeholder="name@example.com" required className="max-w-xs" />
              <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                Add
              </Button>
            </form>
            {addresses.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <li key={a.id} className="flex items-center gap-1.5 rounded-[4px] bg-[var(--color-chip)] px-2.5 py-1 text-[12.5px] text-[var(--color-ink2)]">
                    {a.emailAddress}
                    <button
                      type="button"
                      aria-label={`Remove ${a.emailAddress}`}
                      disabled={pending}
                      onClick={() => startTransition(async () => { await removeNeverSyncAddressAction(a.id); router.refresh(); })}
                      className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
