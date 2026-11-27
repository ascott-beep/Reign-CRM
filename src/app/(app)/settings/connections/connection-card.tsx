import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Status = "connected" | "not-configured" | "coming-soon";

const STATUS_BADGE: Record<Status, { label: string; tone: "success" | "neutral" | "outline" }> = {
  connected: { label: "Connected", tone: "success" },
  "not-configured": { label: "Not configured", tone: "neutral" },
  "coming-soon": { label: "Coming soon", tone: "outline" },
};

/** Round 2 section 6 — one row on Settings -> Connections: status, last run/sync, what it pulls in, and a control. */
export function ConnectionCard({
  title,
  description,
  status,
  detail,
  control,
}: {
  title: string;
  description: string;
  status: Status;
  detail?: string;
  control?: React.ReactNode;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">{description}</p>
          {detail ? <p className="mt-1 text-xs text-[var(--color-muted)]">{detail}</p> : null}
        </div>
        {control ? <div className="shrink-0">{control}</div> : null}
      </CardContent>
    </Card>
  );
}
