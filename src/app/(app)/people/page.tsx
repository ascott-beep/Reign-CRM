import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { personViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import type { Prisma, PersonType } from "@prisma/client";

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

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "PERSON" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.PersonWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (filter?.personType) where.personTypes = { has: filter.personType };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { primaryEmail: { contains: q, mode: "insensitive" } },
      { headlineOverride: { contains: q, mode: "insensitive" } },
    ];
  }
  if (activeView) Object.assign(where, personViewWhere(activeView.filterJson as Record<string, unknown>, user.id));

  const isCandidateView = filterKey === "candidates";

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
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={filter ? filter.label : "People"}
        description={`${total} ${total === 1 ? "person" : "people"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <Button asChild>
              <Link href="/people/new">
                <Plus className="h-4 w-4" /> New person
              </Link>
            </Button>
          </>
        }
      />

      <form className="mb-4 flex max-w-sm gap-2" action="/people" method="GET">
        {filterKey ? <input type="hidden" name="filter" value={filterKey} /> : null}
        <Input name="q" defaultValue={q} placeholder="Search by name or email…" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

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
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Current title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Location</TableHead>
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
