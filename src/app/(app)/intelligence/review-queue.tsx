"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { label } from "@/lib/labels";
import { formatTime, formatShortDate, isTodayInLondon, isYesterdayInLondon } from "@/lib/datetime";
import { suggestedActionFor } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { acceptIntelligenceItemAction, convertIntelligenceToOpportunityAction, acceptAndRemindIntelligenceItemAction, dismissIntelligenceItemAction } from "./actions";
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
  sourcePerson: { id: string; firstName: string; lastName: string } | null;
  sourceUrl: string | null;
  details: string | null;
  sources: { id: string; url: string; title: string | null }[];
};

function friendlyWhen(date: Date) {
  if (isTodayInLondon(date)) return `Today, ${formatTime(date)}`;
  if (isYesterdayInLondon(date)) return "Yesterday";
  return formatShortDate(date);
}

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

/** Round 4 screen 30 (R4Intel) — one card per signal: headline, source and time, summary, linked records, one suggested next step. */
function SignalCard({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissOpen, setDismissOpen] = useState(false);

  const suggestion = suggestedActionFor({
    type: item.type,
    organizationName: item.organization.name,
    sourcePersonName: item.sourcePerson ? `${item.sourcePerson.firstName} ${item.sourcePerson.lastName}` : null,
  });

  function runMainSuggestion() {
    startTransition(async () => {
      if (suggestion.kind === "create_opportunity") {
        await convertIntelligenceToOpportunityAction(item.id);
        return;
      }
      if (suggestion.kind === "update_record") await acceptIntelligenceItemAction(item.id);
      else await acceptAndRemindIntelligenceItemAction(item.id);
      router.refresh();
    });
  }

  function accept() {
    startTransition(async () => {
      await acceptIntelligenceItemAction(item.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <Badge tone="neutral">{label(item.type)}</Badge>
        <span>{friendlyWhen(item.dateReceived)}</span>
        {item.sources[0] ? (
          <>
            <span>·</span>
            <a href={item.sources[0].url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent)]">
              {item.sources[0].title || new URL(item.sources[0].url).hostname}
            </a>
          </>
        ) : null}
      </div>

      <Link href={`/intelligence/${item.id}`} className="mt-2 block text-[15px] font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
        {item.title}
      </Link>
      {item.details ? <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-muted)]">{item.details}</p> : null}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Link href={`/organisations/${item.organization.id}`} className="flex items-center gap-1 rounded-[3px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink2)] hover:text-[var(--color-accent)]">
          <Building2 className="h-3 w-3" /> {item.organization.name}
        </Link>
        {item.sourcePerson ? (
          <Link href={`/people/${item.sourcePerson.id}`} className="flex items-center gap-1 rounded-[3px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink2)] hover:text-[var(--color-accent)]">
            <User className="h-3 w-3" /> {item.sourcePerson.firstName} {item.sourcePerson.lastName}
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-[6px] bg-[var(--color-ai-bg)] px-3 py-2 text-[13px] text-[var(--color-ink)]">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ai-icon)]" />
        <span>Suggested: {suggestion.sentence}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={runMainSuggestion}>
          {suggestion.buttonLabel}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={accept}>
          Accept
        </Button>
        {/* Dismissed signals stay under the Dismissed tab for 30 days (see DismissedList's own "Undo" button), which is the undo surface for this action. */}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDismissOpen(true)} className="ml-auto">
          Dismiss
        </Button>
      </div>
      <DismissDialog item={item} open={dismissOpen} onClose={() => setDismissOpen(false)} />
    </div>
  );
}

export function SignalCardList({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-muted)]">Nothing waiting for review.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <SignalCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function DismissedRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3.5">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] text-[var(--color-ink)]">{item.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {item.organization.name} · Dismissed {item.dismissedAt ? friendlyWhen(item.dismissedAt) : ""} · {item.dismissReason ? label(item.dismissReason) : ""}
        </p>
      </div>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await acceptIntelligenceItemAction(item.id); router.refresh(); })}>
        Undo
      </Button>
    </div>
  );
}

export function DismissedList({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-muted)]">No signals dismissed in the last 30 days.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <DismissedRow key={item.id} item={item} />
      ))}
    </div>
  );
}
