import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { configuredOAuthProviders } from "@/lib/oauth-providers";
import { ConnectionCard } from "./connection-card";
import { AiResearchCard } from "./ai-research-card";
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
export default async function SettingsConnectionsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [workspace, lastRun] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
      select: { intelligenceSweepEnabled: true, intelligenceSweepHourUtc: true, intelligenceSignalTypes: true },
    }),
    prisma.intelligenceRun.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { startedAt: "desc" },
      select: { status: true, signalsFound: true, costUsd: true, startedAt: true, organization: { select: { name: true } } },
    }),
  ]);

  const claudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const { google: googleConfigured, microsoft: microsoftConfigured } = configuredOAuthProviders();

  const lastRunDetail = lastRun
    ? `Last run ${formatDistanceToNowStrict(lastRun.startedAt, { addSuffix: true })} on ${lastRun.organization?.name ?? "a watchlisted company"} · ${
        lastRun.status === "FAILED" ? "failed" : `${lastRun.signalsFound} signal${lastRun.signalsFound === 1 ? "" : "s"} found`
      }${lastRun.costUsd ? ` · $${lastRun.costUsd.toFixed(2)}` : ""}`
    : "Never run yet.";

  return (
    <div className="flex flex-col gap-6">
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
          <ConnectionCard
            title="Outlook (Microsoft 365) email"
            description="Syncs emails with matched contacts into each record's history. Connect your own mailbox — nothing is shared with other users' connections."
            status="not-configured"
            detail={microsoftConfigured ? "Microsoft app is set up — email sync itself is coming in a future update." : "Needs AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET and AZURE_AD_TENANT_ID."}
          />
          <ConnectionCard
            title="Gmail email"
            description="Syncs emails with matched contacts into each record's history. Connect your own mailbox — nothing is shared with other users' connections."
            status="not-configured"
            detail={googleConfigured ? "Google app is set up — email sync itself is coming in a future update." : "Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink-subtle)]">Calendar</h2>
        <div className="flex flex-col gap-3">
          <ConnectionCard
            title="Outlook calendar"
            description="Brings your meetings in as activity on the people and organisations you meet with."
            status="not-configured"
            detail={microsoftConfigured ? "Microsoft app is set up — calendar sync itself is coming in a future update." : "Needs AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET and AZURE_AD_TENANT_ID."}
          />
          <ConnectionCard
            title="Google calendar"
            description="Brings your meetings in as activity on the people and organisations you meet with."
            status="not-configured"
            detail={googleConfigured ? "Google app is set up — calendar sync itself is coming in a future update." : "Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}
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
