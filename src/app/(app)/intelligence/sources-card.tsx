"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function SourceRow({ title, description, connected, onConnect }: { title: string; description: string; connected: boolean; onConnect: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-[13.5px]">{title}</div>
        <div className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</div>
      </div>
      {connected ? (
        <Badge tone="success">Connected</Badge>
      ) : (
        <Button size="sm" variant="secondary" onClick={onConnect}>
          Connect
        </Button>
      )}
    </div>
  );
}

/** No Companies House or news-feed connector exists yet — Connect is presentational, matching the reference's "Feeds that fill the review queue" framing. */
export function SourcesCard() {
  const [connected, setConnected] = useState<Set<string>>(new Set());

  return (
    <section className="flex-1 min-w-[280px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-[18px]">
      <h2 className="m-0 text-base font-medium">Sources</h2>
      <p className="mt-1 text-[13px] text-[var(--color-muted)]">Feeds that fill the review queue</p>
      <div className="mt-3.5">
        <SourceRow
          title="Companies House"
          description="Officer appointments and resignations for every UK organisation in the CRM"
          connected={connected.has("companies-house")}
          onConnect={() => setConnected((c) => new Set(c).add("companies-house"))}
        />
        <SourceRow
          title="News feeds"
          description="PE deal, fundraise and leadership news, matched to organisations"
          connected={connected.has("news")}
          onConnect={() => setConnected((c) => new Set(c).add("news"))}
        />
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] py-3">
          <div className="min-w-0">
            <div className="text-[13.5px]">Team entries</div>
            <div className="mt-0.5 text-xs text-[var(--color-muted)]">Signals logged by hand</div>
          </div>
          <Badge tone="success">On</Badge>
        </div>
      </div>
    </section>
  );
}
