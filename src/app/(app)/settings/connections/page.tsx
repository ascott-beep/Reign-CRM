import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { ConnectionCard } from "./connection-card";
import { AiResearchCard } from "./ai-research-card";
import { MailboxConnectionCard } from "./mailbox-connection-card";
import { NeverSyncList } from "./never-sync-list";
import { formatDistanceToNowStrict } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connections" };

/**
 * Round 2 section 6 — every connection in one place: status, last run or
 * sync time, what it pulls in, and an on/off switch. Each user connects
 * their own mailbox and calendar here (once section 7 builds the actual
 * sync) — so, unlike the rest of Settings, this page is open to everyone,
 * not just administrators. Controls stay hidden behind their env vars
 * until those exist, same as the sign-in buttons on the login page.
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
    <div className="flex flex-col gap-6">
      {connected ? (
        <div className="rounded-[6px] border border-transparent bg-[var(--color-status-success-bg)] px-3.5 py-2.5 text-[13px] text-[var(--color-status-success-ink)]">
          Connected your {connected === "microsoft" ? "Microsoft" : "Google"} account.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[6px] border border-transparent bg-[var(--color-status-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--color-status-danger-ink)]">
          Couldn&rsquo;t connect{message ? `: ${message}` : "."}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-subtle)]">AI research</h2>
        <div className="flex flex-col gap-3">
          <AiResearchCard
            configured={claudeConfigured}
            isAdmin={isAdmin}
            sweepEnabled={workspace.intelligenceSweepEnabled}
            sweepHourUtc={workspace.intelligenceSweepHourUtc}
            signalTypes={workspace.intelligenceSignalTypes}
            lastRunDetail={lastRunDetail}
          />
          <ConnectionCard
            title="AI research · Grok"
            description="A second research provider, as an alternative to Claude."
            status="coming-soon"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-subtle)]">Email</h2>
        <div className="flex flex-col gap-3">
          <MailboxConnectionCard
            title="Outlook (Microsoft 365) email"
            description="Only emails to or from someone matching a Person in Atlas are synced into their history. Connect your own mailbox — nothing is shared with other users' connections."
            provider="MICROSOFT"
            kind="email"
            configured={microsoftConfigured}
            connection={microsoftConnection ? { emailAddress: microsoftConnection.emailAddress, enabled: microsoftConnection.emailSyncEnabled, lastSyncAt: microsoftConnection.lastEmailSyncAt, status: microsoftConnection.status, lastErrorMessage: microsoftConnection.lastErrorMessage } : null}
          />
          <MailboxConnectionCard
            title="Gmail email"
            description="Only emails to or from someone matching a Person in Atlas are synced into their history. Connect your own mailbox — nothing is shared with other users' connections."
            provider="GOOGLE"
            kind="email"
            configured={googleConfigured}
            connection={googleConnection ? { emailAddress: googleConnection.emailAddress, enabled: googleConnection.emailSyncEnabled, lastSyncAt: googleConnection.lastEmailSyncAt, status: googleConnection.status, lastErrorMessage: googleConnection.lastErrorMessage } : null}
          />
        </div>
        {microsoftConnection || googleConnection ? <div className="mt-3"><NeverSyncList addresses={neverSyncAddresses} /></div> : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-subtle)]">Calendar</h2>
        <div className="flex flex-col gap-3">
          <MailboxConnectionCard
            title="Outlook calendar"
            description="Brings your meetings with matched people in as Meeting activity, which feeds their status."
            provider="MICROSOFT"
            kind="calendar"
            configured={microsoftConfigured}
            connection={microsoftConnection ? { emailAddress: microsoftConnection.emailAddress, enabled: microsoftConnection.calendarSyncEnabled, lastSyncAt: microsoftConnection.lastCalendarSyncAt, status: microsoftConnection.status, lastErrorMessage: microsoftConnection.lastErrorMessage } : null}
          />
          <MailboxConnectionCard
            title="Google calendar"
            description="Brings your meetings with matched people in as Meeting activity, which feeds their status."
            provider="GOOGLE"
            kind="calendar"
            configured={googleConfigured}
            connection={googleConnection ? { emailAddress: googleConnection.emailAddress, enabled: googleConnection.calendarSyncEnabled, lastSyncAt: googleConnection.lastCalendarSyncAt, status: googleConnection.status, lastErrorMessage: googleConnection.lastErrorMessage } : null}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-subtle)]">Sign-in</h2>
        <div className="flex flex-col gap-3">
          <ConnectionCard
            title="Google sign-in"
            description="Lets people with a matching email address sign in with their Google account instead of a password."
            status={googleConfigured ? "connected" : "not-configured"}
            detail={googleConfigured ? undefined : "Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}
          />
          <ConnectionCard
            title="Microsoft sign-in"
            description="Lets people with a matching email address sign in with their Microsoft 365 account instead of a password."
            status={microsoftConfigured ? "connected" : "not-configured"}
            detail={microsoftConfigured ? undefined : "Needs AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET and AZURE_AD_TENANT_ID."}
          />
        </div>
      </section>
    </div>
  );
}
