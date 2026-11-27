"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/shell/toast-provider";
import { updateNotificationPreferencesAction } from "../actions";

export type NotificationPrefs = Record<string, { inApp: boolean; email: boolean }>;

const TYPES: { key: string; title: string; description: string }[] = [
  { key: "taskDue", title: "A task is due or overdue", description: "Your own tasks and next steps" },
  { key: "assigned", title: "Someone assigns me something", description: "Tasks, mandates and opportunities" },
  { key: "intelligence", title: "Intelligence finds something", description: "New signals on companies you watch" },
  { key: "candidateStage", title: "A candidate moves stage", description: "On mandates you lead" },
  { key: "weeklySummary", title: "Weekly summary", description: "Mondays at 07:00 UK time" },
];

/** Round 4 screen 34 (R4SetNotifications). Saves to User.notificationPreferences as soon as a switch changes. */
export function NotificationSettingsForm({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [, startTransition] = useTransition();
  const { showToast } = useToast();

  function setValue(key: string, field: "inApp" | "email", value: boolean) {
    const current = prefs[key] ?? { inApp: true, email: false };
    const next: NotificationPrefs = { ...prefs, [key]: { ...current, [field]: value } };
    setPrefs(next);
    startTransition(async () => {
      await updateNotificationPreferencesAction(next);
      showToast({ kind: "success", title: "Saved" });
    });
  }

  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
      <h3 className="px-5 pt-4 text-sm font-semibold">Tell me when</h3>
      {TYPES.map((t, i) => {
        const value = prefs[t.key] ?? { inApp: true, email: false };
        return (
          <div key={t.key} className={`flex items-center justify-between gap-6 px-5 py-4 ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-1"}`}>
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-ink)]">{t.title}</p>
              <p className="text-xs text-[var(--color-ink-subtle)]">{t.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-5">
              <label className="flex items-center gap-2 text-xs text-[var(--color-ink-subtle)]">
                In Atlas
                <Switch checked={value.inApp} onCheckedChange={(v) => setValue(t.key, "inApp", v === true)} />
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--color-ink-subtle)]">
                Email
                <Switch checked={value.email} onCheckedChange={(v) => setValue(t.key, "email", v === true)} />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
