"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await prisma.inAppNotification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await prisma.inAppNotification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
