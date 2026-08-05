import Link from "next/link";
import { ExternalLink, Building2, Landmark, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { label } from "@/lib/labels";
import { formatDistanceToNow } from "date-fns";

export type GridOrganisation = {
  id: string;
  name: string;
  type: string;
  status: string;
  accountPriority: string;
  website: string | null;
  hq: string;
  sectorName: string | null;
  employeeRange: string | null;
  currentInvestors: string;
  holdStage: string | null;
  portfolioCount: number | null;
  contactCount: number;
  ownerName: string | null;
  lastVerifiedAt: Date | null;
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  PRIORITY: "danger",
  ACTIVE: "warning",
};

export function OrganisationGrid({ organisations }: { organisations: GridOrganisation[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {organisations.map((org) => (
        <Link key={org.id} href={`/organisations/${org.id}`} className="block">
          <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                  {org.type === "PE_FUND" ? <Landmark className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-[var(--color-ink)]">
                    {org.name}
                    {org.website ? <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-ink-subtle)]" /> : null}
                  </p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">{label(org.type)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <StatusBadge value={org.status} />
                {org.accountPriority !== "STANDARD" ? (
                  <Badge tone={PRIORITY_TONE[org.accountPriority] ?? "neutral"}>{label(org.accountPriority)}</Badge>
                ) : null}
              </div>

              <dl className="flex flex-1 flex-col gap-1.5 text-xs text-[var(--color-ink-subtle)]">
                {org.hq ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{org.hq}</span>
                  </div>
                ) : null}
                {org.type === "PORTFOLIO_COMPANY" ? (
                  <>
                    {org.sectorName ? <div className="truncate">{org.sectorName}</div> : null}
                    {org.employeeRange ? (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 shrink-0" /> {org.employeeRange} employees
                      </div>
                    ) : null}
                    {org.currentInvestors ? <div className="truncate">Investor: {org.currentInvestors}</div> : null}
                    {org.holdStage ? <div>{label(org.holdStage)}</div> : null}
                  </>
                ) : org.type === "PE_FUND" ? (
                  <>
                    {org.portfolioCount !== null ? (
                      <div>
                        {org.portfolioCount} portfolio compan{org.portfolioCount === 1 ? "y" : "ies"}
                      </div>
                    ) : null}
                    <div>
                      {org.contactCount} contact{org.contactCount === 1 ? "" : "s"}
                    </div>
                  </>
                ) : null}
              </dl>

              <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-ink-subtle)]">
                <span className="truncate">{org.ownerName ?? "Unowned"}</span>
                <span className="shrink-0">
                  {org.lastVerifiedAt ? formatDistanceToNow(org.lastVerifiedAt, { addSuffix: true }) : "Never verified"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
