"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ExampleItem = { id: string; source: string; title: string; tags: string[] };

/**
 * These four cards are the reference screen's own fixtures — no Companies
 * House or news-feed connector exists yet (the "Connect" buttons in the
 * Sources card are presentational), so there is no real queue to read.
 * Accept/Dismiss only removes the card from view; nothing is persisted.
 */
const EXAMPLE_ITEMS: ExampleItem[] = [
  { id: "1", source: "Companies House", title: "New director appointed with a finance remit", tags: ["Kestrel Consumer Brands", "Leadership change"] },
  { id: "2", source: "Companies House", title: "Director resignation filed", tags: ["Pinnacle Energy Systems", "Leadership change"] },
  { id: "3", source: "News feed", title: "Sponsor reported to be raising a new growth fund", tags: ["Solent Growth Partners", "Fundraise"] },
  { id: "4", source: "News feed", title: "Reported acquisition of a new platform company", tags: ["Ashcombe Capital Partners", "Acquisition"] },
];

export function ReviewQueue() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = EXAMPLE_ITEMS.filter((i) => !dismissed.has(i.id));

  return (
    <section className="flex-[1.6_1_480px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-base font-medium">
          Review queue <span className="ml-1 text-[var(--color-muted)]">{visible.length}</span>
        </h2>
        <span className="rounded-[4px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-muted)]">Example items · appear once feeds are connected</span>
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">Queue cleared.</p>
      ) : (
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <div key={item.id} className="rounded-[6px] border border-[var(--color-line)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)]">{item.source}</span>
                <Badge tone="neutral">Example</Badge>
              </div>
              <p className="mt-1.5 text-[13.5px]">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t} className="rounded-[3px] bg-[var(--color-chip)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink2)]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setDismissed((d) => new Set(d).add(item.id))}>
                  Accept
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setDismissed((d) => new Set(d).add(item.id))}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
