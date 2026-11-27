import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSweepForWorkspace } from "@/lib/intelligence-sweep";

/**
 * Round 2 section 5 "Daily sweep: a Vercel cron at a time set in Settings."
 * Vercel Cron Jobs on the Hobby plan only run once a day, so this route
 * itself fires hourly (needs the Pro plan or higher — see README) and each
 * workspace's own `intelligenceSweepHourUtc` decides which firing it acts
 * on, giving each workspace an effectively once-daily sweep at its own
 * chosen hour.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: "ANTHROPIC_API_KEY not set, the research agent is not configured yet." });
  }

  const currentHourUtc = new Date().getUTCHours();
  const workspaces = await prisma.workspace.findMany({
    where: { intelligenceSweepEnabled: true, intelligenceSweepHourUtc: currentHourUtc },
    select: { id: true },
  });

  const results = [];
  for (const workspace of workspaces) {
    const result = await runSweepForWorkspace(workspace.id);
    results.push({ workspaceId: workspace.id, ...result });
  }

  return NextResponse.json({ sweptWorkspaces: results.length, results });
}
