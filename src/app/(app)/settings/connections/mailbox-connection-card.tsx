"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { disconnectMailboxAction, toggleMailboxSyncAction } from "./actions";
import type { MailProvider } from "@prisma/client";

export function MailboxConnectionCard({
  title,
  description,
  provider,
  kind,
  configured,
  connection,
}: {
  title: string;
  description: string;
  provider: MailProvider;
  kind: "email" | "calendar";
  configured: boolean;
  connection: { emailAddress: string; enabled: boolean; lastSyncAt: Date | null; status: string; lastErrorMessage: string | null } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const statusBadge = !connection
    ? { label: configured ? "Not connected" : "Not configured", tone: "neutral" as const }
    : connection.status === "ERROR"
      ? { label: "Needs reconnecting", tone: "warning" as const }
      : { label: "Connected", tone: "success" as const };

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">{description}</p>
          {connection ? (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {connection.emailAddress}
              {connection.lastSyncAt ? ` · last synced ${formatDistanceToNowStrict(connection.lastSyncAt, { addSuffix: true })}` : " · not synced yet"}
              {connection.status === "ERROR" && connection.lastErrorMessage ? ` · ${connection.lastErrorMessage}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-muted)]">{configured ? "Connect your own mailbox below." : `Needs the ${provider === "MICROSOFT" ? "Microsoft" : "Google"} app set up first.`}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {connection ? (
            <>
              <Switch
                checked={connection.enabled}
                disabled={pending}
                onCheckedChange={(checked) =>
                  startTransition(async () => {
                    await toggleMailboxSyncAction(provider, kind, checked);
                    router.refresh();
                  })
                }
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!window.confirm(`Disconnect your ${provider === "MICROSOFT" ? "Microsoft" : "Google"} account? This turns off both email and calendar sync for it.`)) return;
                    await disconnectMailboxAction(provider);
                    router.refresh();
                  })
                }
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" disabled={!configured} asChild={configured}>
              {configured ? <a href={`/api/connections/${provider.toLowerCase()}/start`}>Connect</a> : <span>Connect</span>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
