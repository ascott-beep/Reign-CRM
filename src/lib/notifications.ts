import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Round 4 screen 05 (R4Notifications). The InAppNotification model already
 * existed in the schema but nothing wrote to it yet — this is the one
 * place that creates a row, so every notification type stays consistent
 * (title, body, the record it links to). Call sites: task reassignment,
 * an interview being scheduled, a high-priority intelligence signal. Other
 * actions (logged emails, invites accepted) can call this the same way
 * when their own sections are built.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  relatedTaskId?: string;
  /** One of "OPPORTUNITY" | "MANDATE" | "ORGANIZATION" | "PERSON" | "TASK" | "INTELLIGENCE_ITEM" -- see hrefForNotification() in notification-bell.tsx. */
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  await prisma.inAppNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      relatedTaskId: input.relatedTaskId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    },
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.inAppNotification.count({ where: { userId, readAt: null } });
}
