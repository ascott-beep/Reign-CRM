import "server-only";
import { prisma } from "@/lib/prisma";
import { ClaudeIntelligenceProvider } from "@/lib/intelligence-claude-provider";
import type { IntelligenceProvider, ResearchSignal } from "@/lib/intelligence-provider";

function getProvider(): IntelligenceProvider {
  return new ClaudeIntelligenceProvider();
}

/**
 * Round 2 section 5 "Watchlist: priority organisations, tracked PE funds and
 * their portfolio companies, and any company with an open opportunity or
 * mandate. Adding a company to Atlas adds it automatically." — computed on
 * the fly from criteria already on Organization/Opportunity/Mandate, so
 * nothing needs separate "add to watchlist" bookkeeping.
 */
export async function computeWatchlist(workspaceId: string) {
  return prisma.organization.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      OR: [
        { accountPriority: "PRIORITY" },
        { type: "PE_FUND" },
        { relationshipsAsTarget: { some: { sourceOrganization: { type: "PE_FUND" } } } },
        { opportunitiesAsHiringOrg: { some: { archivedAt: null, stage: { notIn: ["WON", "LOST"] } } } },
        { mandatesAsHiringOrg: { some: { archivedAt: null, status: { notIn: ["FILLED", "CANCELLED"] } } } },
      ],
    },
    select: { id: true, name: true, website: true },
  });
}

/** Dismiss reasons from past reviews, fed back into the agent's instructions so it learns what to skip. */
async function dismissContextFor(workspaceId: string, organizationId: string): Promise<string | undefined> {
  const dismissed = await prisma.intelligenceItem.findMany({
    where: { workspaceId, organizationId, reviewState: "DISMISSED" },
    orderBy: { dismissedAt: "desc" },
    take: 10,
    select: { title: true, dismissReason: true },
  });
  if (dismissed.length === 0) return undefined;
  return dismissed.map((d) => `- "${d.title}" was dismissed as ${d.dismissReason ?? "not relevant"}`).join("\n");
}

async function findMentionedPerson(workspaceId: string, name: string | undefined) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [firstName, ...rest] = parts;
  const lastName = rest.join(" ");
  return prisma.person.findFirst({
    where: { workspaceId, firstName: { equals: firstName, mode: "insensitive" }, lastName: { equals: lastName, mode: "insensitive" } },
    select: { id: true },
  });
}

/** One company's sweep: research, then persist new signals as PENDING_REVIEW, merging same-story duplicates onto one signal's source list. */
export async function researchOrganization(workspaceId: string, organizationId: string, systemUserId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true, website: true } });
  const provider = getProvider();

  const run = await prisma.intelligenceRun.create({
    data: { workspaceId, organizationId, provider: provider.name, status: "RUNNING" },
  });

  try {
    const context = await dismissContextFor(workspaceId, organizationId);
    const { signals, costUsd } = await provider.research({ companyName: org.name, website: org.website, context });

    const existingOpen = await prisma.intelligenceItem.findMany({
      where: { workspaceId, organizationId, reviewState: { in: ["PENDING_REVIEW", "ACCEPTED"] } },
      select: { id: true, title: true },
    });

    let created = 0;
    for (const signal of signals as ResearchSignal[]) {
      // Merge onto an existing signal reporting the same story instead of duplicating it.
      const dup = existingOpen.find((e) => e.title.trim().toLowerCase() === signal.summary.trim().toLowerCase());
      if (dup) {
        if (signal.sources.length) {
          await prisma.intelligenceSource.createMany({
            data: signal.sources.map((s) => ({ intelligenceItemId: dup.id, url: s.url, title: s.title })),
          });
        }
        continue;
      }

      const mentionedPerson = await findMentionedPerson(workspaceId, signal.mentionedPersonName);
      const item = await prisma.intelligenceItem.create({
        data: {
          workspaceId,
          title: signal.summary,
          organizationId,
          type: signal.type,
          confidence: signal.confidence,
          reviewState: "PENDING_REVIEW",
          sourceUrl: signal.sources[0]?.url,
          sourcePersonId: mentionedPerson?.id,
          ownerId: systemUserId,
          createdById: systemUserId,
          runId: run.id,
          details: signal.likelyRole ? `Likely role: ${signal.likelyRole}` : null,
          sources: signal.sources.length ? { create: signal.sources.map((s) => ({ url: s.url, title: s.title })) } : undefined,
        },
      });
      existingOpen.push({ id: item.id, title: item.title });
      created += 1;
    }

    await prisma.intelligenceRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", signalsFound: created, costUsd, finishedAt: new Date() },
    });

    return { signalsFound: created, costUsd };
  } catch (error) {
    await prisma.intelligenceRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : String(error), finishedAt: new Date() },
    });
    throw error;
  }
}

/** The daily sweep: every watchlisted company, one run each. Used by the cron and left callable per-workspace for "Research now". */
export async function runSweepForWorkspace(workspaceId: string) {
  const [workspace, watchlist] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { id: true } }),
    computeWatchlist(workspaceId),
  ]);
  const systemUser = await prisma.user.findFirst({ where: { workspaceId: workspace.id, role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!systemUser) return { ran: 0, failed: 0 };

  let ran = 0;
  let failed = 0;
  for (const org of watchlist) {
    try {
      await researchOrganization(workspaceId, org.id, systemUser.id);
      ran += 1;
    } catch {
      failed += 1;
    }
  }
  return { ran, failed };
}
