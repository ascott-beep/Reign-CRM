"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { addNeverSyncAddressAction, removeNeverSyncAddressAction } from "./actions";

/** Section 7 "Each user has a 'never sync' list" — addresses that should never be synced in, even if they match a Person. */
export function NeverSyncList({ addresses }: { addresses: { id: string; emailAddress: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="pt-4">
        <h3 className="text-sm font-semibold">Never sync these addresses</h3>
        <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">Emails to or from these addresses are skipped even if they match someone in Atlas.</p>

        <form
          ref={formRef}
          action={(formData) =>
            startTransition(async () => {
              await addNeverSyncAddressAction(formData);
              formRef.current?.reset();
              router.refresh();
            })
          }
          className="mt-3 flex gap-2"
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
      </CardContent>
    </Card>
  );
}
