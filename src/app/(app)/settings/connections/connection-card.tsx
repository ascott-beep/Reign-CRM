import Image from "next/image";
import { Badge } from "@/components/ui/badge";

type Status = "connected" | "not-connected" | "coming-soon" | "needs-attention";

const STATUS_BADGE: Record<Status, { label: string; tone: "success" | "neutral" | "warning" }> = {
  connected: { label: "Connected", tone: "success" },
  "not-connected": { label: "Not connected", tone: "neutral" },
  "coming-soon": { label: "Coming soon", tone: "neutral" },
  "needs-attention": { label: "Needs attention", tone: "warning" },
};

/** Round 4 screen 33 (R4SetConnections) — one row: icon, name + status, one line of detail, one control. */
export function ConnectionRow({
  icon,
  logoSrc,
  title,
  description,
  status,
  detail,
  control,
}: {
  /** A lucide icon element, used when there's no official provider logo. */
  icon?: React.ReactNode;
  /** Path under /public to an official provider logo (preferred over `icon` when given). */
  logoSrc?: string;
  title: string;
  description: string;
  status: Status;
  detail?: string;
  control?: React.ReactNode;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-line)] bg-[var(--color-surface)]">
          {logoSrc ? <Image src={logoSrc} alt="" width={18} height={18} /> : icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-ink)]">{title}</h3>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-subtle)]">{description}</p>
          {detail ? <p className="mt-0.5 text-xs text-[var(--color-muted)]">{detail}</p> : null}
        </div>
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  );
}
