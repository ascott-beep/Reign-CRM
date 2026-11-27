"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { label } from "@/lib/labels";
import { formatShortDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
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

/** Round 4 screen 23 (DlgR4Dismiss) — one reason picked in one click. */
function DismissDialog({ item, open, onClose }: { item: QueueItem; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState<IntelligenceDismissReason>("NOT_RELEVANT");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dismiss this signal</DialogTitle>
        </DialogHeader>
        <div className="rounded-[6px] bg-[var(--color-sunk)] p-3">
          <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{item.title}</p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
            {item.organization.name} · {label(item.type)} · {item.sources.length} source{item.sources.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {DISMISS_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] border px-3.5 py-2.5 text-left text-[13.5px]",
                reason === r ? "border-[var(--color-navy)]" : "border-[var(--color-line)]",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  reason === r ? "border-[var(--color-navy)]" : "border-[var(--color-muted)]",
                )}
              >
                {reason === r ? <span className="h-2 w-2 rounded-full bg-[var(--color-navy)]" /> : null}
              </span>
              {label(r)}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-ink-subtle)]">Your reason teaches the research agent what to skip next time.</p>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await dismissIntelligenceItemAction(item.id, reason);
                router.refresh();
                onClose();
              })
            }
          >
            {pending ? "Dismissing…" : "Dismiss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QueueCard({ item, mode }: { item: QueueItem; mode: "pending" | "dismissed" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissOpen, setDismissOpen] = useState(false);

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
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDismissOpen(true)}>
            Dismiss
          </Button>
          <DismissDialog item={item} open={dismissOpen} onClose={() => setDismissOpen(false)} />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Dismissed {item.dismissedAt ? formatShortDate(item.dismissedAt) : ""} · {item.dismissReason ? label(item.dismissReason) : ""}</span>
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
    <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
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
        <p className="mt-3.5 text-sm text-[var(--color-muted)]">
          {tab === "pending" ? "Nothing waiting for review" : "No signals dismissed in the last 30 days."}
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
