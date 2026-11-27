import { Mail, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { ConnectionRow } from "./connection-card";
import { AiResearchCard } from "./ai-research-card";
import { MailboxConnectionCard } from "./mailbox-connection-card";
import { WhatGetsLoggedCard } from "./what-gets-logged-card";
import { formatDistanceToNowStrict } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connections" };

/**
 * Round 4 screen 33 (R4SetConnections) — three groups: AI, Email and
 * calendar, What gets logged. Sign-in is kept as a fourth group below
 * (real, working functionality the picture doesn't happen to show).
 */
export default async function SettingsConnectionsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string; message?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { connected, error, message } = await searchParams;

  const [workspace, lastRun, mailboxConnections, neverSyncAddresses] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
      select: { intelligenceSweepEnabled: true, intelligenceSweepHourUtc: true, intelligenceSignalTypes: true },
    }),
    prisma.intelligenceRun.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { startedAt: "desc" },
      select: { status: true, signalsFound: true, costUsd: true, startedAt: true, organization: { select: { name: true } } },
    }),
    prisma.mailboxConnection.findMany({ where: { userId: user.id } }),
    prisma.neverSyncAddress.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const claudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { google: googleConfigured, microsoft: microsoftConfigured } = configuredOAuthProviders();
  const microsoftConnection = mailboxConnections.find((c) => c.provider === "MICROSOFT") ?? null;
  const googleConnection = mailboxConnections.find((c) => c.provider === "GOOGLE") ?? null;

  const lastRunDetail = lastRun
    ? `Last run ${formatDistanceToNowStrict(lastRun.startedAt, { addSuffix: true })} on ${lastRun.organization?.name ?? "a watchlisted company"} · ${
        lastRun.status === "FAILED" ? "failed" : `${lastRun.signalsFound} signal${lastRun.signalsFound === 1 ? "" : "s"} found`
      }${lastRun.costUsd ? ` · $${lastRun.costUsd.toFixed(2)}` : ""}`
    : "Never run yet.";

  return (
    <div className="max-w-3xl">
      <h2 className="m-0 text-lg font-medium text-[var(--color-ink)]">Connections</h2>
      <p className="mt-1 mb-6 text-sm text-[var(--color-ink-subtle)]">The apps Atlas uses on your behalf.</p>

      {connected ? (
        <div className="mb-4 rounded-[6px] border border-transparent bg-[var(--color-status-success-bg)] px-3.5 py-2.5 text-[13px] text-[var(--color-status-success-ink)]">
          Connected your {connected === "microsoft" ? "Microsoft" : "Google"} account.
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-[6px] border border-transparent bg-[var(--color-status-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--color-status-danger-ink)]">
          Couldn&rsquo;t connect{message ? `: ${message}` : "."}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-2 text-base font-medium text-[var(--color-ink)]">AI</h3>
          <p className="mb-3 text-[13px] text-[var(--color-ink-subtle)]">Atlas uses these to answer questions and research companies.</p>
          <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
            <AiResearchCard
              configured={claudeConfigured}
              isAdmin={isAdmin}
              sweepEnabled={workspace.intelligenceSweepEnabled}
              sweepHourUtc={workspace.intelligenceSweepHourUtc}
              signalTypes={workspace.intelligenceSignalTypes}
              lastRunDetail={lastRunDetail}
            />
            <ConnectionRow
              title="Grok"
              description="A second model for live news. We'll add it when it's ready."
              status="coming-soon"
              control={
                <button type="button" disabled className="h-8 rounded-md border border-[var(--color-line)] px-3 text-sm text-[var(--color-ink-subtle)] opacity-60">
                  Connect
                </button>
              }
            />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-base font-medium text-[var(--color-ink)]">Email and calendar</h3>
          <p className="mb-3 text-[13px] text-[var(--color-ink-subtle)]">Emails to and from people in Atlas are logged on their records automatically.</p>
          <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
            <MailboxConnectionCard
              title="Outlook"
              description="Only emails to or from someone matching a Person in Atlas are synced into their history. Connect your own mailbox, nothing is shared with other users' connections."
              provider="MICROSOFT"
              kind="email"
              configured={microsoftConfigured}
              connection={microsoftConnection ? { emailAddress: microsoftConnection.emailAddress, enabled: microsoftConnection.emailSyncEnabled, lastSyncAt: microsoftConnection.lastEmailSyncAt, status: microsoftConnection.status, lastErrorMessage: microsoftConnection.lastErrorMessage } : null}
            />
            <MailboxConnectionCard
              title="Gmail"
              description="Only emails to or from someone matching a Person in Atlas are synced into their history. Connect your own mailbox, nothing is shared with other users' connections."
              provider="GOOGLE"
              kind="email"
              configured={googleConfigured}
              connection={googleConnection ? { emailAddress: googleConnection.emailAddress, enabled: googleConnection.emailSyncEnabled, lastSyncAt: googleConnection.lastEmailSyncAt, status: googleConnection.status, lastErrorMessage: googleConnection.lastErrorMessage } : null}
            />
            {microsoftConnection ? (
              <ConnectionRow
                icon={<Calendar className="h-4 w-4 text-[var(--color-ink2)]" />}
                title="Calendar"
                description="Meetings with known contacts are logged on their records. Private events are skipped."
                status="connected"
                detail="From Outlook"
                control={
                  <a href="/settings/connections" className="inline-flex h-8 items-center rounded-md border border-[var(--color-line)] px-3 text-sm">
                    Settings
                  </a>
                }
              />
            ) : googleConnection ? (
              <ConnectionRow
                icon={<Calendar className="h-4 w-4 text-[var(--color-ink2)]" />}
                title="Calendar"
                description="Meetings with known contacts are logged on their records. Private events are skipped."
                status="connected"
                detail="From Google"
                control={
                  <a href="/settings/connections" className="inline-flex h-8 items-center rounded-md border border-[var(--color-line)] px-3 text-sm">
                    Settings
                  </a>
                }
              />
            ) : (
              <ConnectionRow
                icon={<Calendar className="h-4 w-4 text-[var(--color-muted)]" />}
                title="Calendar"
                description="Connect Outlook or Gmail above to bring in meetings too."
                status="not-connected"
              />
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-base font-medium text-[var(--color-ink)]">What gets logged</h3>
          <WhatGetsLoggedCard addresses={neverSyncAddresses} hasAnyConnection={Boolean(microsoftConnection || googleConnection)} />
        </section>

        <section>
          <h3 className="mb-2 text-base font-medium text-[var(--color-ink)]">Sign-in</h3>
          <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
            <ConnectionRow
              icon={<Mail className="h-4 w-4 text-[var(--color-ink2)]" />}
              title="Google sign-in"
              description="Lets people with a matching email address sign in with their Google account instead of a password."
              status={googleConfigured ? "connected" : "not-connected"}
              detail={googleConfigured ? undefined : "Not set up yet."}
            />
            <ConnectionRow
              icon={<Mail className="h-4 w-4 text-[var(--color-ink2)]" />}
              title="Microsoft sign-in"
              description="Lets people with a matching email address sign in with their Microsoft 365 account instead of a password."
              status={microsoftConfigured ? "connected" : "not-connected"}
              detail={microsoftConfigured ? undefined : "Not set up yet."}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
