import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { NotificationSettingsForm, type NotificationPrefs } from "./notification-settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

/** Round 4 screen 34 (R4SetNotifications). */
export default async function SettingsNotificationsPage() {
  const user = await requireUser();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { notificationPreferences: true } });
  const initial = (record.notificationPreferences as NotificationPrefs) ?? {};

  return (
    <div className="max-w-xl">
      <h2 className="m-0 text-lg font-medium text-[var(--color-ink)]">Notifications</h2>
      <p className="mt-1 mb-6 text-sm text-[var(--color-ink-subtle)]">Choose what reaches you and where.</p>
      <NotificationSettingsForm initial={initial} />
    </div>
  );
}
