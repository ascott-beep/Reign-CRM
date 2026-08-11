import {
  Phone,
  Mail,
  Users,
  Share2,
  MessageCircle,
  StickyNote,
  Video,
  RefreshCw,
  Zap,
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  ArrowRightCircle,
  type LucideIcon,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { label } from "@/lib/labels";
import type { TimelineItem } from "@/lib/timeline";

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  LINKEDIN_MESSAGE: Share2,
  WHATSAPP: MessageCircle,
  NOTE: StickyNote,
  INTERVIEW: Video,
  INTERNAL_UPDATE: RefreshCw,
  SYSTEM_EVENT: Zap,
  OTHER: ActivityIcon,
};

function friendlyDate(date: Date) {
  if (isToday(date)) return `Today, ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, "HH:mm")}`;
  return format(date, "d MMM yyyy, HH:mm");
}

function IconBubble({ icon: Icon, tone }: { icon: LucideIcon; tone: "highlight" | "success" | "neutral" }) {
  const toneClass =
    tone === "highlight"
      ? "bg-[var(--color-highlight-subtle)] text-[var(--color-highlight)]"
      : tone === "success"
        ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-ink)]"
        : "bg-[var(--color-status-neutral-bg)] text-[var(--color-ink-subtle)]";
  return (
    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", toneClass)}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  if (item.kind === "activity") {
    const Icon = ACTIVITY_ICONS[item.activityType] ?? ActivityIcon;
    return (
      <div className="flex gap-3">
        <IconBubble icon={Icon} tone="highlight" />
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-[var(--color-ink)]">{item.subject || label(item.activityType)}</p>
            <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">{friendlyDate(item.date)}</span>
          </div>
          {item.summary ? <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{item.summary}</p> : null}
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
            {label(item.activityType)} · {item.actorName}
            {item.outcome ? ` · ${label(item.outcome)}` : ""}
          </p>
        </div>
      </div>
    );
  }

  if (item.kind === "task") {
    return (
      <div className="flex gap-3">
        <IconBubble icon={item.completed ? CheckCircle2 : Circle} tone={item.completed ? "success" : "neutral"} />
        <div className="min-w-0 flex-1 pb-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
            <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">{friendlyDate(item.date)}</span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
            {item.completed ? "Completed" : "Due"} · {item.assigneeName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <IconBubble icon={ArrowRightCircle} tone="neutral" />
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            {item.fromLabel ? `${label(item.fromLabel)} → ${label(item.toLabel)}` : `Set to ${label(item.toLabel)}`}
          </p>
          <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">{friendlyDate(item.date)}</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">Stage changed · {item.actorName}</p>
      </div>
    </div>
  );
}

export function Timeline({ items, emptyLabel }: { items: TimelineItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-ink-subtle)]">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => (
        <TimelineRow key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
