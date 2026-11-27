import Link from "next/link";
import { Plus, ExternalLink, Download, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canExport, canMutate } from "@/lib/permissions";
import { findAllOrganizationDuplicatePairs } from "@/lib/duplicates";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { FilterPopover } from "@/components/shell/filter-popover";
import { UndoDeleteToast } from "@/components/shell/undo-delete-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { label } from "@/lib/labels";
import { initials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { holdStageFromAcquisitionDate } from "@/lib/rules";
import { OrganizationDuplicateTag } from "./duplicate-tag";
import type { Prisma, OrganizationType, OrganizationStatus } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organisations" };

const TABS: { key: string; label: string; type?: OrganizationType }[] = [
  { key: "all", label: "All" },
  { key: "funds", label: "PE funds", type: "PE_FUND" },
  { key: "portfolio", label: "Portfolio", type: "PORTFOLIO_COMPANY" },
  { key: "other", label: "Other" },
];

const HOLD_STAGE_LABEL: Record<string, string> = {
  NEWLY_ACQUIRED: "Newly acquired",
  EARLY_HOLD: "Early hold",
  MID_HOLD: "Mid hold",
  LATE_HOLD: "Late hold",
  EXIT_ANNOUNCED: "Exit announced",
  UNKNOWN: "Unknown",
};

const STALE_MS = 60 * 24 * 60 * 60 * 1000;

function getMulti(sp: { [key: string]: string | string[] | undefined }, key: string): string[] {
  const v = sp[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tabKey = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const take = Math.max(25, Number(sp.take) || 25);

  const typeFilter = getMulti(sp, "type");
  const statusFilter = getMulti(sp, "status");
  const holdFilter = getMulti(sp, "hold");
  const verifiedFilter = getMulti(sp, "verified");

  const where: Prisma.OrganizationWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (tab.type) where.type = tab.type;
  else if (tabKey === "other") where.type = { notIn: ["PE_FUND", "PORTFOLIO_COMPANY"] };
  if (typeFilter.length > 0) where.type = { in: typeFilter as OrganizationType[] };
  if (statusFilter.length > 0) where.status = { in: statusFilter as OrganizationStatus[] };
  if (q) {
    where.OR = [{ name: { contains: q, mode: "insensitive" } }, { normalizedWebsiteDomain: { contains: q.toLowerCase(), mode: "insensitive" } }];
  }

  const [allForCounts, duplicates] = await Promise.all([
    prisma.organization.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null },
      select: { id: true, type: true, status: true, lastVerifiedAt: true, investmentStageOverride: true, relationshipsAsTarget: { select: { investmentDate: true }, where: { investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } }, take: 1, orderBy: { investmentDate: "asc" } } },
    }),
    findAllOrganizationDuplicatePairs(user.workspaceId),
  ]);

  function holdOf(o: (typeof allForCounts)[number]) {
    return o.investmentStageOverride ?? (o.relationshipsAsTarget[0]?.investmentDate ? holdStageFromAcquisitionDate(o.relationshipsAsTarget[0].investmentDate) : null);
  }
  const tabCounts = {
    all: allForCounts.length,
    funds: allForCounts.filter((o) => o.type === "PE_FUND").length,
    portfolio: allForCounts.filter((o) => o.type === "PORTFOLIO_COMPANY").length,
    other: allForCounts.filter((o) => o.type !== "PE_FUND" && o.type !== "PORTFOLIO_COMPANY").length,
  };
  const typeCounts = { PE_FUND: 0, PORTFOLIO_COMPANY: 0, ADVISER: 0, LENDER: 0, OTHER_COMPANY: 0 } as Record<string, number>;
  const statusCounts = {} as Record<string, number>;
  const holdCounts = { NEWLY_ACQUIRED: 0, EARLY_HOLD: 0, MID_HOLD: 0, LATE_HOLD: 0 } as Record<string, number>;
  let staleCount = 0;
  let neverVerifiedCount = 0;
  let upToDateCount = 0;
  for (const o of allForCounts) {
    typeCounts[o.type] = (typeCounts[o.type] ?? 0) + 1;
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    const hold = holdOf(o);
    if (hold && hold in holdCounts) holdCounts[hold]!++;
    if (!o.lastVerifiedAt) neverVerifiedCount++;
    else if (Date.now() - o.lastVerifiedAt.getTime() > STALE_MS) staleCount++;
    else upToDateCount++;
  }

  // Hold and Verified are calculated, not columns — filtered in JS below, after fetch.
  const organizations = await prisma.organization.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: take + 1,
    include: {
      relationshipOwner: true,
      sectors: { include: { sector: true }, take: 1 },
      relationshipsAsTarget: { where: { investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } }, include: { sourceOrganization: { select: { name: true } } }, orderBy: { investmentDate: "asc" } },
      relationshipsAsSource: { where: { archivedAt: null } },
    },
  });

  let rows = organizations.slice(0, take).map((org) => {
    const hold = org.investmentStageOverride ?? (org.relationshipsAsTarget[0]?.investmentDate ? holdStageFromAcquisitionDate(org.relationshipsAsTarget[0].investmentDate) : null);
    const verified = !org.lastVerifiedAt ? "never" : Date.now() - org.lastVerifiedAt.getTime() > STALE_MS ? "stale" : "fresh";
    return { org, hold, verified };
  });
  if (holdFilter.length > 0) rows = rows.filter((r) => r.hold && holdFilter.includes(r.hold));
  if (verifiedFilter.length > 0) {
    rows = rows.filter((r) => (verifiedFilter.includes("stale") && r.verified === "stale") || (verifiedFilter.includes("never") && r.verified === "never") || (verifiedFilter.includes("fresh") && r.verified === "fresh"));
  }
  const hasMore = organizations.length > take;

  const filterGroups = [
    {
      key: "type",
      label: "Type",
      options: [
        { value: "PE_FUND", label: "PE fund", count: typeCounts.PE_FUND ?? 0 },
        { value: "PORTFOLIO_COMPANY", label: "Portfolio company", count: typeCounts.PORTFOLIO_COMPANY ?? 0 },
        { value: "ADVISER", label: "Adviser", count: typeCounts.ADVISER ?? 0 },
        { value: "LENDER", label: "Lender", count: typeCounts.LENDER ?? 0 },
        { value: "OTHER_COMPANY", label: "Other company", count: typeCounts.OTHER_COMPANY ?? 0 },
      ].filter((o) => o.count > 0),
    },
    {
      key: "status",
      label: "Status",
      options: Object.entries(statusCounts).map(([value, count]) => ({ value, label: label(value), count })),
    },
    {
      key: "hold",
      label: "Hold",
      options: [
        { value: "NEWLY_ACQUIRED", label: "Newly acquired", count: holdCounts.NEWLY_ACQUIRED ?? 0 },
        { value: "EARLY_HOLD", label: "Early hold", count: holdCounts.EARLY_HOLD ?? 0 },
        { value: "MID_HOLD", label: "Mid hold", count: holdCounts.MID_HOLD ?? 0 },
        { value: "LATE_HOLD", label: "Late hold", count: holdCounts.LATE_HOLD ?? 0 },
      ].filter((o) => o.count > 0),
    },
    {
      key: "verified",
      label: "Verified",
      options: [
        { value: "stale", label: "Stale (60+ days)", count: staleCount },
        { value: "never", label: "Never verified", count: neverVerifiedCount },
        { value: "fresh", label: "Up to date", count: upToDateCount },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organisations"
        description="Funds, portfolio companies and advisers you work with"
        actions={
          <>
            {canExport(user.role) ? (
              <Button variant="secondary" asChild>
                <a href="/api/export/organizations">
                  <Download className="h-[14px] w-[14px]" /> Export
                </a>
              </Button>
            ) : null}
            {canMutate(user.role) ? (
              <Button variant="secondary" asChild>
                <Link href="/import/organisations">
                  <Upload className="h-[14px] w-[14px]" /> Import
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/organisations/new">
                <Plus className="h-[14px] w-[14px]" /> New organisation
              </Link>
            </Button>
          </>
        }
        user={user}
      />

      <div data-toolbar className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Views" className="flex gap-[3px] rounded-[4px] border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "all" ? "/organisations" : `/organisations?tab=${t.key}`}
              role="tab"
              className={`flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-[12.5px] no-underline ${tabKey === t.key ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]"}`}
            >
              <span>{t.label}</span>
              <span className="opacity-60">{tabCounts[t.key as keyof typeof tabCounts]}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/organisations" method="GET">
            {tabKey !== "all" ? <input type="hidden" name="tab" value={tabKey} /> : null}
            <label className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--color-line)] bg-[var(--color-card)] px-3.5 text-[13px] text-[var(--color-muted)]">
              <Input name="q" defaultValue={q} placeholder="Filter by name, title or company" className="h-auto w-60 border-0 bg-transparent p-0 text-[var(--color-ink)] shadow-none focus-visible:ring-0" />
            </label>
          </form>
          <FilterPopover
            groups={filterGroups}
            selected={{ type: typeFilter, status: statusFilter, hold: holdFilter, verified: verifiedFilter }}
            resultCount={rows.length}
            resultNoun="organisations"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No organisations found"
          description="Try adjusting your filters, or create a new organisation to get started."
          action={
            <Button asChild size="sm" className="mt-2">
              <Link href="/organisations/new">
                <Plus className="h-4 w-4" /> New organisation
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="grid grid-cols-[minmax(0,2fr)_130px_minmax(0,1.3fr)_minmax(0,1.1fr)_120px_120px_110px] gap-4 border-b border-[var(--color-line)] px-5 py-2.5 text-xs text-[var(--color-muted)]">
            <span>Organisation</span>
            <span>Status</span>
            <span>Sector / focus</span>
            <span>Investor</span>
            <span>Hold</span>
            <span>Owner</span>
            <span>Verified</span>
          </div>
          {rows.map(({ org, hold, verified }) => {
            const dup = duplicates.get(org.id);
            return (
              <div key={org.id} className="grid grid-cols-[minmax(0,2fr)_130px_minmax(0,1.3fr)_minmax(0,1.1fr)_120px_120px_110px] items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 text-[13.5px] last:border-b-0">
                <Link href={`/organisations/${org.id}`} className="flex min-w-0 items-center gap-3 text-[var(--color-ink)] no-underline">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-navy)] text-[11px] font-semibold text-[var(--color-navy-ink)]">
                    {initials(org.name.split(" ")[0] ?? org.name, org.name.split(" ")[1] ?? "")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{org.name}</span>
                    <span className="block truncate text-xs text-[var(--color-muted)]">{label(org.type)}</span>
                  </span>
                  {org.website ? <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-muted)]" /> : null}
                </Link>
                <span>{dup ? <OrganizationDuplicateTag organizationId={org.id} survivorId={dup.survivorId} survivorName={dup.survivorName} /> : <StatusBadge value={org.status} />}</span>
                <span className="truncate text-[var(--color-ink2)]">
                  {org.type === "PE_FUND" ? `${org.relationshipsAsSource.length} portfolio co${org.relationshipsAsSource.length === 1 ? "" : "s"}` : org.sectors[0]?.sector.name ?? "—"}
                </span>
                <span className="truncate text-[var(--color-ink2)]">{org.relationshipsAsTarget.length > 0 ? org.relationshipsAsTarget.map((r) => r.sourceOrganization.name).join(", ") : "—"}</span>
                <span>{hold ? <Badge tone={hold === "NEWLY_ACQUIRED" ? "info" : "neutral"}>{HOLD_STAGE_LABEL[hold]}</Badge> : "—"}</span>
                <span className="truncate text-[var(--color-ink2)]">{org.relationshipOwner ? `${org.relationshipOwner.firstName} ${org.relationshipOwner.lastName}` : "—"}</span>
                <span className={verified === "stale" ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]"}>{org.lastVerifiedAt ? formatDistanceToNow(org.lastVerifiedAt, { addSuffix: true }) : "Never"}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-[13px] text-[var(--color-muted)]">
        <span>
          Showing {rows.length} of {tabCounts[tabKey as keyof typeof tabCounts]}
        </span>
        {hasMore ? (
          <Link href={`?${new URLSearchParams({ ...(tabKey !== "all" ? { tab: tabKey } : {}), ...(q ? { q } : {}), take: String(take + 25) })}`} className="text-[var(--color-ink2)] no-underline">
            Load more
          </Link>
        ) : null}
      </div>
      <UndoDeleteToast type="ORGANIZATION" />
    </div>
  );
}
