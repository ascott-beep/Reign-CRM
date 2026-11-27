"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Sparkles, Calendar, SquareCheck, Mail, UserPlus } from "lucide-react";
import type { ComponentType } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { formatInLondon, isTodayInLondon, isYesterdayInLondon } from "@/lib/datetime";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./notification-actions";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
};

type Filter = "all" | "unread" | "mine";

const TYPE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  INTELLIGENCE_HIGH_PRIORITY: Sparkles,
  INTERVIEW_SCHEDULED: Calendar,
  INTERVIEW_CHANGED: Calendar,
  TASK_ASSIGNED: SquareCheck,
  ASSIGNED_TO_RECORD: SquareCheck,
  TASK_DUE_TODAY: SquareCheck,
  TASK_OVERDUE: SquareCheck,
  PROCESS_OFFER: Mail,
  PROCESS_PLACED: Mail,
  OTHER: UserPlus,
};

/** Round 4 screen 05 (R4Notifications) — relative time to a minute/hour, then the weekday, matching "8 min ago" / "1 hr ago" / "Yesterday" / "Mon" in the design. Minute/hour buckets are a plain elapsed duration (no timezone involved); the weekday goes through the London-pinned helper like every other date in the app. */
function friendlyNotificationTime(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && isTodayInLondon(date)) return `${hours} hr ago`;
  if (isYesterdayInLondon(date)) return "Yesterday";
  return formatInLondon(date, "EEE");
}

/** Where clicking a notification row goes — kept here rather than in lib/notifications.ts since it's purely a UI concern. */
function hrefForNotification(n: NotificationRow): string | null {
  if (!n.relatedEntityType || !n.relatedEntityId) return null;
  const base: Record<string, string> = {
    OPPORTUNITY: "/opportunities",
    MANDATE: "/mandates",
    ORGANIZATION: "/organisations",
    PERSON: "/people",
    INTELLIGENCE_ITEM: "/intelligence",
  };
  const prefix = base[n.relatedEntityType];
  if (n.relatedEntityType === "TASK") return "/tasks";
  return prefix ? `${prefix}/${n.relatedEntityId}` : null;
}

/**
 * Round 4 Part B + screen 05: the bell sits next to "+ New" in the sidebar
 * (see sidebar.tsx), 36px, with an orange dot while anything is unread.
 * `initialUnreadCount` is server-rendered (see (app)/layout.tsx) so the dot
 * is correct on first paint without a client round trip; opening the panel
 * re-fetches the live list.
 */
export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    fetch(`/api/notifications?filter=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => setItems([]));
  }, [open, filter]);

  function openRow(n: NotificationRow) {
    setOpen(false);
    if (!n.readAt) {
      startTransition(() => markNotificationReadAction(n.id));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    const href = hrefForNotification(n);
    if (href) router.push(href);
  }

  function markAllRead() {
    startTransition(() => markAllNotificationsReadAction());
    setItems((rows) => rows?.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })) ?? null);
    setUnreadCount(0);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          title="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink2)] transition-colors hover:bg-[var(--color-active)]"
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.6} />
          {unreadCount > 0 ? <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full bg-[var(--color-alert)]" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[400px] p-0">
        <div className="flex items-center justify-between px-4 pt-3.5">
          <h3 className="text-[15px] font-medium text-[var(--color-ink)]">Notifications</h3>
          {unreadCount > 0 ? (
            <button type="button" onClick={markAllRead} className="text-[12.5px] text-[var(--color-ink2)] hover:text-[var(--color-ink)]">
              Mark all as read
            </button>
          ) : null}
        </div>
        <div className="px-4 pb-3 pt-3">
          <SegmentedToggle
            name="Notification filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: `Unread${unreadCount > 0 ? ` · ${unreadCount}` : ""}` },
              { value: "mine", label: "Assigned to me" },
            ]}
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items === null ? (
            <div className="flex flex-col gap-3 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-active)]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-active)]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-active)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-ink-subtle)]">Nothing here.</p>
          ) : (
            items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const unread = !n.readAt;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openRow(n)}
                  className={cnRow(unread)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[var(--color-ink2)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-snug text-[var(--color-ink)]">{n.title}</span>
                    {n.body ? <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-subtle)]">{n.body}</span> : null}
                  </span>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs text-[var(--color-ink-subtle)]">
                    {friendlyNotificationTime(n.createdAt)}
                    {unread ? <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-alert)]" /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-[var(--color-line)] px-4 py-2.5">
          <a href="/settings/notifications" className="text-[12.5px] text-[var(--color-ink2)] hover:text-[var(--color-ink)]">
            Notification settings
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function cnRow(unread: boolean) {
  return [
    "flex w-full items-start gap-3 border-t border-[var(--color-line)] px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-[var(--color-active)]",
    unread ? "bg-[var(--color-ai-bg)]" : "",
  ].join(" ");
}
