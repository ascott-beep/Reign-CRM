"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConnectionRow } from "./connection-card";
import { disconnectMailboxAction, toggleMailboxSyncAction } from "./actions";
import type { MailProvider } from "@prisma/client";

const LOGO: Record<MailProvider, string> = { MICROSOFT: "/brand/microsoft.png", GOOGLE: "/brand/google-g.png" };

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
  const providerName = provider === "MICROSOFT" ? "Microsoft" : "Google";

  const status = !connection ? "not-connected" : connection.status === "ERROR" ? "needs-attention" : "connected";

  const detail = !connection
    ? configured
      ? "Connect your own mailbox below."
      : `Needs the ${providerName} app set up first.`
    : `${connection.emailAddress}${connection.lastSyncAt ? ` · last synced ${formatDistanceToNowStrict(connection.lastSyncAt, { addSuffix: true })}` : " · not synced yet"}${
        connection.status === "ERROR" && connection.lastErrorMessage ? ` · ${connection.lastErrorMessage}` : ""
      }`;

  return (
    <ConnectionRow
      logoSrc={LOGO[provider]}
      title={title}
      description={description}
      status={status}
      detail={detail}
      control={
        connection ? (
          <div className="flex items-center gap-3">
            {status === "needs-attention" ? (
              <Button size="sm" variant="secondary" asChild>
                <a href={`/api/connections/${provider.toLowerCase()}/start`}>Reconnect</a>
              </Button>
            ) : (
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
                      if (!window.confirm(`Disconnect your ${providerName} account? This turns off both email and calendar sync for it.`)) return;
                      await disconnectMailboxAction(provider);
                      router.refresh();
                    })
                  }
                >
                  Manage
                </Button>
              </>
            )}
          </div>
        ) : (
          <Button size="sm" variant="secondary" disabled={!configured} asChild={configured}>
            {configured ? <a href={`/api/connections/${provider.toLowerCase()}/start`}>Connect</a> : <span>Connect</span>}
          </Button>
        )
      }
    />
  );
}
