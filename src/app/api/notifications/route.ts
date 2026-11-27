import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";

/** Round 4 screen 05 (R4Notifications) — list the current user's notifications for the bell panel. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;

  const filter = request.nextUrl.searchParams.get("filter") ?? "all";
  const where =
    filter === "unread"
      ? { userId: user.id, readAt: null }
      : filter === "mine"
        ? { userId: user.id, relatedTask: { assignedUserId: user.id } }
        : { userId: user.id };

  const [notifications, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.inAppNotification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
