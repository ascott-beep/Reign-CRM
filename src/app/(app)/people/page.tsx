import Link from "next/link";
import { Plus, Download, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canExport, canMutate } from "@/lib/permissions";
import { findAllPersonDuplicatePairs } from "@/lib/duplicates";
import { PageHeader } from "@/components/shell/page-header";
import { FixBanner } from "@/components/shell/fix-banner";
import { EmptyState } from "@/components/shell/states";
import { FilterPopover } from "@/components/shell/filter-popover";
import { UndoDeleteToast } from "@/components/shell/undo-delete-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { label } from "@/lib/labels";
import { initials } from "@/lib/utils";
import { candidatePlainStatus, isCandidateHidden, orgShortName, fitLabel } from "@/lib/rules";
import { PersonDuplicateTag } from "./duplicate-tag";
import type { Prisma, PersonType } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "People" };

const TABS: { key: string; label: string; personType?: PersonType }[] = [
  { key: "all", label: "All" },
  { key: "candidates", label: "Candidates", personType: "CANDIDATE" },
  { key: "client-contacts", label: "Client contacts", personType: "CLIENT_CONTACT" },
];

function getMulti(sp: { [key: string]: string | string[] | undefined }, key: string): string[] {
  const v = sp[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tabKey = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const take = Math.max(25, Number(sp.take) || 25);
  const typeFilter = getMulti(sp, "type");
  const statusFilter = getMulti(sp, "status");
  const fitFilter = getMulti(sp, "fit");

  const fix = typeof sp.fix === "string" ? sp.fix : undefined;

  const where: Prisma.PersonWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (tab.personType) where.personTypes = { has: tab.personType };
  if (typeFilter.length > 0) where.personTypes = { hasSome: typeFilter as PersonType[] };
  if (fix === "no-employment") {
    where.personTypes = { has: "CANDIDATE" };
    where.employmentHistories = { none: {} };
  }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { primaryEmail: { contains: q, mode: "insensitive" } },
      { headlineOverride: { contains: q, mode: "insensitive" } },
    ];
  }

  const [allForCounts, duplicates] = await Promise.all([
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null },
      select: { id: true, personTypes: true, relationshipStatus: true, candidateProfile: { select: { rating: true } } },
    }),
    findAllPersonDuplicatePairs(user.workspaceId),
  ]);

  const tabCounts = {
    all: allForCounts.length,
    candidates: allForCounts.filter((p) => p.personTypes.includes("CANDIDATE")).length,
    "client-contacts": allForCounts.filter((p) => p.personTypes.includes("CLIENT_CONTACT")).length,
  };
  const statusCounts: Record<string, number> = {};
  const fitCounts: Record<string, number> = {};
  for (const p of allForCounts) {
    statusCounts[p.relationshipStatus] = (statusCounts[p.relationshipStatus] ?? 0) + 1;
    if (p.candidateProfile && p.candidateProfile.rating !== "NOT_RATED") {
      fitCounts[p.candidateProfile.rating] = (fitCounts[p.candidateProfile.rating] ?? 0) + 1;
    }
  }

  if (statusFilter.length > 0) where.relationshipStatus = { in: statusFilter as Prisma.PersonWhereInput["relationshipStatus"] extends { in?: infer T } | undefined ? T : never };
  if (fitFilter.length > 0) where.candidateProfile = { rating: { in: fitFilter as Prisma.CandidateProfileWhereInput["rating"] extends { in?: infer T } | undefined ? T : never } };

  const people = await prisma.person.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: take + 1,
    include: {
      relationshipOwner: true,
      currentOrganizationOverride: { select: { name: true } },
      candidateProfile: true,
      employmentHistories: { where: { isCurrent: true }, include: { organization: { select: { name: true } } }, take: 1 },
      organizationAssociations: { where: { isCurrent: true }, include: { organization: { select: { name: true } } }, take: 1 },
      candidateProcesses: { include: { mandate: { select: { hiringOrganization: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" } },
    },
  });
  const hasMore = people.length > take;
  const rows = people.slice(0, take);

  const filterGroups = [
    {
      key: "type",
      label: "Type",
      options: [
        { value: "CANDIDATE", label: "Candidate", count: allForCounts.filter((p) => p.personTypes.includes("CANDIDATE")).length },
        { value: "CLIENT_CONTACT", label: "Client contact", count: allForCounts.filter((p) => p.personTypes.includes("CLIENT_CONTACT")).length },
        { value: "INVESTOR", label: "Investor", count: allForCounts.filter((p) => p.personTypes.includes("INVESTOR")).length },
        { value: "OPERATING_PARTNER", label: "Operating partner", count: allForCounts.filter((p) => p.personTypes.includes("OPERATING_PARTNER")).length },
      ].filter((o) => o.count > 0),
    },
    {
      key: "status",
      label: "Status",
      options: Object.entries(statusCounts).map(([value, count]) => ({ value, label: label(value), count })),
    },
    {
      key: "fit",
      label: "Fit",
      options: [
        { value: "A_STRONG", label: "Strong", count: fitCounts.A_STRONG ?? 0 },
        { value: "B_RELEVANT", label: "Good", count: fitCounts.B_RELEVANT ?? 0 },
        { value: "C_UNQUALIFIED", label: "Possible", count: fitCounts.C_UNQUALIFIED ?? 0 },
      ].filter((o) => o.count > 0),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="People"
        description="Candidates and client contacts"
        actions={
          <>
            {canExport(user.role) ? (
              <Button variant="secondary" asChild>
                <a href="/api/export/people">
                  <Download className="h-[14px] w-[14px]" /> Export
                </a>
              </Button>
            ) : null}
            {canMutate(user.role) ? (
              <Button variant="secondary" asChild>
                <Link href="/import/people">
                  <Upload className="h-[14px] w-[14px]" /> Import
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/people/new">
                <Plus className="h-[14px] w-[14px]" /> New person
              </Link>
            </Button>
          </>
        }
      />

      <div data-toolbar className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Views" className="flex gap-[3px] rounded-[4px] border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "all" ? "/people" : `/people?tab=${t.key}`}
              role="tab"
              className={`flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-[12.5px] no-underline ${tabKey === t.key ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]"}`}
            >
              <span>{t.label}</span>
              <span className="opacity-60">{tabCounts[t.key as keyof typeof tabCounts]}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/people" method="GET">
            {tabKey !== "all" ? <input type="hidden" name="tab" value={tabKey} /> : null}
            <label className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--color-line)] bg-[var(--color-card)] px-3.5 text-[13px] text-[var(--color-muted)]">
              <Input name="q" defaultValue={q} placeholder="Filter by name, title or company" className="h-auto w-60 border-0 bg-transparent p-0 text-[var(--color-ink)] shadow-none focus-visible:ring-0" />
            </label>
          </form>
          <FilterPopover groups={filterGroups} selected={{ type: typeFilter, status: statusFilter, fit: fitFilter }} resultCount={rows.length} resultNoun="people" />
        </div>
      </div>

      {fix === "no-employment" ? <FixBanner label="Candidates without employment history" clearHref="/people" /> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No people found"
          action={
            <Button asChild size="sm" className="mt-2">
              <Link href="/people/new">
                <Plus className="h-4 w-4" /> New person
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)_110px_120px_90px_minmax(0,1.2fr)_110px] gap-4 border-b border-[var(--color-line)] px-5 py-2.5 text-xs text-[var(--color-muted)]">
            <span>Name</span>
            <span>Organisation</span>
            <span>Type</span>
            <span>Status</span>
            <span>Fit</span>
            <span>Live processes</span>
            <span>Owner</span>
          </div>
          {rows.map((p) => {
            const isCandidate = p.personTypes.includes("CANDIDATE");
            const dup = duplicates.get(p.id);
            const orgName =
              p.currentOrganizationOverride?.name ??
              p.organizationAssociations[0]?.organization.name ??
              p.employmentHistories[0]?.organization?.name ??
              p.employmentHistories[0]?.employerNameFallback ??
              null;
            const title = p.headlineOverride?.split(",")[0] ?? p.employmentHistories[0]?.jobTitle ?? null;
            const fit = p.candidateProfile ? fitLabel(p.candidateProfile.rating) : null;

            const liveProcesses = p.candidateProcesses.filter((proc) => !isCandidateHidden(proc.stage) && proc.stage !== "PLACED");
            const latestProcess = p.candidateProcesses[0];
            let liveProcessesText = "";
            if (liveProcesses.length === 1) {
              liveProcessesText = `1 · ${candidatePlainStatus(liveProcesses[0]!.stage).label.toLowerCase()}`;
            } else if (liveProcesses.length > 1) {
              liveProcessesText = `${liveProcesses.length} · ${liveProcesses
                .slice(0, 2)
                .map((proc) => orgShortName(proc.mandate.hiringOrganization.name))
                .join(", ")}`;
            } else if (latestProcess) {
              liveProcessesText = `${candidatePlainStatus(latestProcess.stage).label} · ${orgShortName(latestProcess.mandate.hiringOrganization.name)}`;
            } else if (!isCandidate && p.organizationAssociations[0]?.stakeholderRoles?.[0]) {
              liveProcessesText = label(p.organizationAssociations[0].stakeholderRoles[0]);
            }

            return (
              <div key={p.id} className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)_110px_120px_90px_minmax(0,1.2fr)_110px] items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 text-[13.5px] last:border-b-0">
                <Link href={`/people/${p.id}`} className="flex min-w-0 items-center gap-3 text-[var(--color-ink)] no-underline">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[11px] font-semibold text-[var(--color-ink2)]">
                    {initials(p.firstName, p.lastName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-muted)]">{title ?? ""}</span>
                  </span>
                </Link>
                <span className="truncate text-[var(--color-ink2)]">{orgName ?? ""}</span>
                <span>
                  <Badge tone="neutral">{isCandidate ? "Candidate" : "Client contact"}</Badge>
                </span>
                <span>{dup ? <PersonDuplicateTag personId={p.id} survivorId={dup.survivorId} survivorName={dup.survivorName} /> : <StatusBadge value={p.relationshipStatus} />}</span>
                <span className="text-[var(--color-ink2)]">{fit ?? ""}</span>
                <span className="truncate text-[var(--color-ink2)]">{liveProcessesText}</span>
                <span className="truncate text-[var(--color-ink2)]">{p.relationshipOwner ? `${p.relationshipOwner.firstName} ${p.relationshipOwner.lastName}` : "Unowned"}</span>
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
      <UndoDeleteToast type="PERSON" />
    </div>
  );
}
