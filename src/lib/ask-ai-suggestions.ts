import "server-only";
import { prisma } from "@/lib/prisma";
import { mandateVisibilityWhere, type SessionUser } from "@/lib/permissions";
import { LIVE_MANDATE_STATUSES } from "@/lib/rules";
import { startOfTodayInLondon } from "@/lib/datetime";

export type SuggestedQuestion = { text: string; tag: string };

/**
 * Round 4 screen 01 (R4AskOpen) "4 suggested questions based on where you
 * are" -- the generic, not-on-a-record set shown from the sidebar bar.
 * A record's own "Ask" button still seeds its own record-specific prompts
 * (see ask-atlas-provider.tsx), these are the workspace-wide defaults.
 */
export async function getSuggestedAskQuestions(user: SessionUser): Promise<SuggestedQuestion[]> {
  const in7Days = new Date(startOfTodayInLondon().getTime() + 7 * 24 * 60 * 60 * 1000);

  const [mandateWithUpcomingInterview, mostRecentLiveMandate] = await Promise.all([
    prisma.interview.findFirst({
      where: {
        scheduledStart: { gte: startOfTodayInLondon(), lte: in7Days },
        candidateProcess: { mandate: { workspaceId: user.workspaceId, archivedAt: null, ...mandateVisibilityWhere(user) } },
      },
      orderBy: { scheduledStart: "asc" },
      select: { candidateProcess: { select: { mandate: { select: { title: true } } } } },
    }),
    prisma.mandate.findFirst({
      where: { workspaceId: user.workspaceId, archivedAt: null, status: { in: [...LIVE_MANDATE_STATUSES] }, ...mandateVisibilityWhere(user) },
      orderBy: { updatedAt: "desc" },
      select: { title: true },
    }),
  ]);

  const mandateRoleTitle = mandateWithUpcomingInterview?.candidateProcess.mandate.title;

  return [
    {
      text: mandateRoleTitle ? `Who is interviewing for the ${mandateRoleTitle} role?` : "Which of my searches have interviews this week?",
      tag: "Mandates",
    },
    { text: "What is overdue across my searches this week?", tag: "Tasks" },
    {
      text: mostRecentLiveMandate ? `Summarise the ${mostRecentLiveMandate.title} search` : "Summarise my open searches",
      tag: "Mandate",
    },
    { text: "Which candidates have we spoken to this month?", tag: "People" },
  ];
}
