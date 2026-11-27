"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { label } from "@/lib/labels";
import { format } from "date-fns";
import { acceptIntelligenceItemAction, convertIntelligenceToOpportunityAction, dismissIntelligenceItemAction } from "./actions";
import type { IntelligenceConfidence, IntelligenceDismissReason, IntelligenceType } from "@prisma/client";

const DISMISS_REASONS: IntelligenceDismissReason[] = ["NOT_RELEVANT", "WRONG_COMPANY", "ALREADY_KNEW"];

export type QueueItem = {
  id: string;
  title: string;
  type: IntelligenceType;
  confidence: IntelligenceConfidence;
  dateReceived: Date;
  dismissReason: IntelligenceDismissReason | null;
  dismissedAt: Date | null;
  organization: { id: string; name: string };
  sources: { id: string; url: string; title: string | null }[];
};

function QueueCard({ item, mode }: { item: QueueItem; mode: "pending" | "dismissed" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-[6px] border border-[var(--color-line)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-[var(--color-muted)]">{item.organization.name}</span>
        <Badge tone="neutral">{label(item.type)}</Badge>
      </div>
      <p className="mt-1.5 text-[13.5px]">{item.title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.sources.length === 0 ? (
          <span className="rounded-[3px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink2)]">No source link</span>
        ) : (
          item.sources.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-[3px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink2)] hover:text-[var(--color-accent)]">
              {s.title || new URL(s.url).hostname}
            </a>
          ))
        )}
      </div>
      {mode === "pending" ? (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" disabled={pending} onClick={() => startTransition(async () => { await acceptIntelligenceItemAction(item.id); router.refresh(); })}>
            Accept
          </Button>
          <form action={convertIntelligenceToOpportunityAction.bind(null, item.id)}>
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              <ArrowRightCircle className="h-[13px] w-[13px]" /> Accept &amp; create opportunity
            </Button>
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={pending}>
                Dismiss
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {DISMISS_REASONS.map((reason) => (
                <DropdownMenuItem key={reason} onSelect={() => startTransition(async () => { await dismissIntelligenceItemAction(item.id, reason); router.refresh(); })}>
                  {label(reason)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Dismissed {item.dismissedAt ? format(item.dismissedAt, "d MMM") : ""} · {item.dismissReason ? label(item.dismissReason) : "—"}</span>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await acceptIntelligenceItemAction(item.id); router.refresh(); })}>
            Undo
          </Button>
        </div>
      )}
    </div>
  );
}

/** Round 2 section 5 "Review queue": real PENDING_REVIEW signals from the research agent, with a "Dismissed" filter for the last 30 days (per the brief — after that they're simply excluded by the date filter, no separate cron needed to delete them). */
export function ReviewQueue({ pending, dismissed }: { pending: QueueItem[]; dismissed: QueueItem[] }) {
  const [tab, setTab] = useState<"pending" | "dismissed">("pending");
  const items = tab === "pending" ? pending : dismissed;

  return (
    <section className="flex-[1.6_1_480px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-base font-medium">
          Review queue <span className="ml-1 text-[var(--color-muted)]">{pending.length}</span>
        </h2>
        <div className="flex gap-1 rounded-[6px] bg-[var(--color-chip)] p-0.5 text-[12px]">
          <button type="button" onClick={() => setTab("pending")} className={`rounded-[4px] px-2.5 py-1 ${tab === "pending" ? "bg-[var(--color-card)] font-medium" : "text-[var(--color-muted)]"}`}>
            Pending
          </button>
          <button type="button" onClick={() => setTab("dismissed")} className={`rounded-[4px] px-2.5 py-1 ${tab === "dismissed" ? "bg-[var(--color-card)] font-medium" : "text-[var(--color-muted)]"}`}>
            Dismissed ({dismissed.length})
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">
          {tab === "pending" ? "Nothing waiting for review. The research agent checks the watchlist on its daily sweep." : "No signals dismissed in the last 30 days."}
        </p>
      ) : (
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <QueueCard key={item.id} item={item} mode={tab} />
          ))}
        </div>
      )}
    </section>
  );
}
