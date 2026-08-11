import Link from "next/link";
import { Plus, Download, Upload, LayoutGrid, List as ListIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canExport, canMutate } from "@/lib/permissions";
import { personViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PracticeAreaBadge } from "@/components/ui/practice-area-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { cn, formatMoney } from "@/lib/utils";
import { PeopleFilters } from "./people-filters";
import { PeopleGrid, type GridPerson } from "./people-grid";
import type { Prisma, PersonType, Seniority } from "@prisma/client";

const SENIORITY_VALUES: Seniority[] = [
  "BOARD_OR_C_SUITE",
  "N_MINUS_1",
  "DIRECTOR_OR_VP",
  "HEAD_OF",
  "SENIOR_MANAGER",
  "MANAGER",
  "INDIVIDUAL_CONTRIBUTOR",
  "CONSULTANT_OR_INTERIM",
  "OTHER",
];

const PAGE_SIZE = 25;

const FILTERS: Record<string, { label: string; personType?: PersonType }> = {
  candidates: { label: "Candidates", personType: "CANDIDATE" },
  "client-contacts": { label: "Client Contacts", personType: "CLIENT_CONTACT" },
  investors: { label: "Investors", personType: "INVESTOR" },
  "operating-partners": { label: "Operating Partners", personType: "OPERATING_PARTNER" },
  "talent-hr": { label: "Talent / HR", personType: "TALENT_OR_HR" },
  referrers: { label: "Referrers", personType: "REFERRER" },
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filterKey = typeof sp.filter === "string" ? sp.filter : undefined;
  const filter = filterKey ? FILTERS[filterKey] : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const display = sp.display === "table" ? "table" : "grid";
  const practiceAreaId = typeof sp.practiceAreaId === "string" ? sp.practiceAreaId : undefined;
  const seniority = typeof sp.seniority === "string" && SENIORITY_VALUES.includes(sp.seniority as Seniority) ? (sp.seniority as Seniority) : undefined;

  const [views, activeView, practiceAreas] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "PERSON" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const where: Prisma.PersonWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (filter?.personType) where.personTypes = { has: filter.personType };
  if (activeView) Object.assign(where, personViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const andConditions: Prisma.PersonWhereInput[] = [];
  if (q) {
    andConditions.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { primaryEmail: { contains: q, mode: "insensitive" } },
        { headlineOverride: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (practiceAreaId) andConditions.push({ practiceAreas: { some: { practiceAreaId } } });
  if (seniority) {
    andConditions.push({
      OR: [
        { employmentHistories: { some: { isCurrent: true, seniority } } },
        { candidateProfile: { seniorityValues: { has: seniority } } },
      ],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

  const isCandidateView = filterKey === "candidates";

  function hrefWithDisplay(nextDisplay: "grid" | "table") {
    const params = new URLSearchParams();
    if (filterKey) params.set("filter", filterKey);
    if (q) params.set("q", q);
    if (practiceAreaId) params.set("practiceAreaId", practiceAreaId);
    if (seniority) params.set("seniority", seniority);
    if (viewId) params.set("view", viewId);
    params.set("display", nextDisplay);
    return `?${params.toString()}`;
  }

  const [total, people] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        relationshipOwner: { select: { firstName: true, lastName: true } },
        currentOrganizationOverride: { select: { name: true } },
        candidateProfile: true,
        employmentHistories: { where: { isCurrent: true }, include: { organization: { select: { name: true } } }, take: 1 },
        practiceAreas: { include: { practiceArea: true } },
      },
    }),
  ]);

  const gridData: GridPerson[] = people.map((p) => {
    const employment = p.employmentHistories[0];
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      title: p.headlineOverride?.split(",")[0] ?? employment?.jobTitle ?? null,
      organisationName: p.currentOrganizationOverride?.name ?? employment?.organization?.name ?? null,
      city: p.city,
      ownerName: p.relationshipOwner ? `${p.relationshipOwner.firstName} ${p.relationshipOwner.lastName}` : null,
      statusValue: isCandidateView ? (p.candidateProfile?.status ?? null) : p.relationshipStatus,
      candidateRating: isCandidateView && p.candidateProfile ? p.candidateProfile.rating : null,
      compensation:
        isCandidateView && p.candidateProfile?.expectedBaseAmount != null
          ? formatMoney(p.candidateProfile.expectedBaseAmount, p.candidateProfile.expectedBaseCurrency)
          : null,
      practiceAreas: p.practiceAreas.map((pa) => ({ id: pa.practiceArea.id, name: pa.practiceArea.name, colorHex: pa.practiceArea.colorHex })),
    };
  });

  return (
    <div>
      <PageHeader
        title={filter ? filter.label : "People"}
        description={`${total} ${total === 1 ? "person" : "people"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <div className="flex overflow-hidden rounded-md border border-[var(--color-border-strong)]">
              <Link
                href={hrefWithDisplay("grid")}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs", display === "grid" ? "bg-[var(--color-canvas)]" : "")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid
              </Link>
              <Link
                href={hrefWithDisplay("table")}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs border-l border-[var(--color-border-strong)]", display === "table" ? "bg-[var(--color-canvas)]" : "")}
              >
                <ListIcon className="h-3.5 w-3.5" /> Table
              </Link>
            </div>
            {canExport(user.role) ? (
              <Button variant="secondary" asChild>
                <a href={`/api/export/people${filterKey ? `?filter=${filterKey}` : ""}`}>
                  <Download className="h-4 w-4" /> Export CSV
                </a>
              </Button>
            ) : null}
            {canMutate(user.role) ? (
              <Button variant="secondary" asChild>
                <Link href="/import/people">
                  <Upload className="h-4 w-4" /> Import CSV
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/people/new">
                <Plus className="h-4 w-4" /> New person
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex max-w-sm flex-1 gap-2" action="/people" method="GET">
          {filterKey ? <input type="hidden" name="filter" value={filterKey} /> : null}
          <input type="hidden" name="display" value={display} />
          {practiceAreaId ? <input type="hidden" name="practiceAreaId" value={practiceAreaId} /> : null}
          {seniority ? <input type="hidden" name="seniority" value={seniority} /> : null}
          <Input name="q" defaultValue={q} placeholder="Search by name or email…" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <PeopleFilters practiceAreas={practiceAreas} currentPracticeAreaId={practiceAreaId ?? "all"} currentSeniority={seniority ?? "all"} />
      </div>

      {people.length === 0 ? (
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
      ) : display === "grid" ? (
        <PeopleGrid people={gridData} />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Current title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Practice Areas</TableHead>
                {isCandidateView ? (
                  <>
                    <TableHead>Candidate status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Compensation expectation</TableHead>
                  </>
                ) : (
                  <TableHead>Relationship status</TableHead>
                )}
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                const employment = p.employmentHistories[0];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/people/${p.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                        {p.firstName} {p.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{p.headlineOverride?.split(",")[0] ?? employment?.jobTitle ?? "—"}</TableCell>
                    <TableCell>{p.currentOrganizationOverride?.name ?? employment?.organization?.name ?? "—"}</TableCell>
                    <TableCell>{p.city || "—"}</TableCell>
                    <TableCell>
                      {p.practiceAreas.length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.practiceAreas.map((pa) => (
                            <PracticeAreaBadge key={pa.practiceAreaId} name={pa.practiceArea.name} colorHex={pa.practiceArea.colorHex} />
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {isCandidateView ? (
                      <>
                        <TableCell>{p.candidateProfile ? <StatusBadge value={p.candidateProfile.status} /> : "—"}</TableCell>
                        <TableCell>{p.candidateProfile ? label(p.candidateProfile.rating) : "—"}</TableCell>
                        <TableCell>{formatMoney(p.candidateProfile?.expectedBaseAmount, p.candidateProfile?.expectedBaseCurrency)}</TableCell>
                      </>
                    ) : (
                      <TableCell>
                        <StatusBadge value={p.relationshipStatus} />
                      </TableCell>
                    )}
                    <TableCell>{p.relationshipOwner ? `${p.relationshipOwner.firstName} ${p.relationshipOwner.lastName}` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-ink-subtle)]">
          <span>
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
