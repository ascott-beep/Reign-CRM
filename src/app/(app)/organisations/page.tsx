import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { organizationViewWhere } from "@/lib/saved-views";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { SavedViewsMenu } from "@/components/shell/saved-views-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { countryName } from "@/lib/iso";
import { formatDistanceToNow } from "date-fns";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

function currentHoldStage(investmentDate: Date | null | undefined, override: string | null | undefined) {
  if (override) return override;
  if (!investmentDate) return "UNKNOWN";
  const months = (Date.now() - investmentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 12) return "NEWLY_ACQUIRED";
  if (months < 24) return "EARLY_HOLD";
  if (months < 48) return "MID_HOLD";
  return "LATE_HOLD";
}

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const typeParam = typeof sp.type === "string" ? sp.type : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const viewId = typeof sp.view === "string" ? sp.view : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [views, activeView] = await Promise.all([
    prisma.savedView.findMany({ where: { workspaceId: user.workspaceId, entityType: "ORGANIZATION" }, orderBy: { name: "asc" } }),
    viewId ? prisma.savedView.findUnique({ where: { id: viewId } }) : Promise.resolve(null),
  ]);

  const where: Prisma.OrganizationWhereInput = { workspaceId: user.workspaceId, archivedAt: null };
  if (typeParam === "PE_FUND") where.type = "PE_FUND";
  else if (typeParam === "PORTFOLIO_COMPANY") where.type = "PORTFOLIO_COMPANY";
  else if (typeParam === "OTHER") where.type = { notIn: ["PE_FUND", "PORTFOLIO_COMPANY"] };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { normalizedWebsiteDomain: { contains: q.toLowerCase(), mode: "insensitive" } },
    ];
  }

  if (activeView) {
    Object.assign(where, organizationViewWhere(activeView.filterJson as Record<string, unknown>, user.id));
  }

  const [total, organizations] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        relationshipOwner: { select: { firstName: true, lastName: true } },
        sectors: { include: { sector: true }, take: 1 },
        relationshipsAsTarget: {
          where: { archivedAt: null, investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } },
          include: { sourceOrganization: { select: { name: true } } },
        },
        relationshipsAsSource: {
          where: { archivedAt: null, investmentStatus: { in: ["CURRENT", "ANNOUNCED", "PARTIALLY_EXITED"] } },
        },
        _count: { select: { personAssociations: true } },
      },
    }),
  ]);

  const title =
    typeParam === "PE_FUND" ? "Funds" : typeParam === "PORTFOLIO_COMPANY" ? "Portfolio Companies" : typeParam === "OTHER" ? "Other Organisations" : "Organisations";

  const isPortfolioView = typeParam === "PORTFOLIO_COMPANY";
  const isFundView = typeParam === "PE_FUND";

  return (
    <div>
      <PageHeader
        title={title}
        description={`${total} organisation${total === 1 ? "" : "s"}`}
        actions={
          <>
            <SavedViewsMenu views={views} />
            <Button asChild>
              <Link href="/organisations/new">
                <Plus className="h-4 w-4" /> New organisation
              </Link>
            </Button>
          </>
        }
      />

      <form className="mb-4 flex max-w-sm gap-2" action="/organisations" method="GET">
        {typeParam ? <input type="hidden" name="type" value={typeParam} /> : null}
        <Input name="q" defaultValue={q} placeholder="Search by name or domain…" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {organizations.length === 0 ? (
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
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {isPortfolioView ? (
                  <>
                    <TableHead>Sector</TableHead>
                    <TableHead>Headquarters</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Current Investors</TableHead>
                    <TableHead>Hold Stage</TableHead>
                  </>
                ) : isFundView ? (
                  <>
                    <TableHead>Headquarters</TableHead>
                    <TableHead>Portfolio Count</TableHead>
                    <TableHead>Contacts</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Type</TableHead>
                    <TableHead>Headquarters</TableHead>
                  </>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => {
                const hq = [org.hqCity, org.hqCountryCode ? countryName(org.hqCountryCode) : null].filter(Boolean).join(", ");
                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <Link href={`/organisations/${org.id}`} className="text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                        {org.name}
                      </Link>
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noreferrer" className="ml-1.5 inline-block align-middle text-[var(--color-ink-subtle)]">
                          <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ) : null}
                    </TableCell>
                    {isPortfolioView ? (
                      <>
                        <TableCell>{org.sectors[0]?.sector.name ?? "—"}</TableCell>
                        <TableCell>{hq || "—"}</TableCell>
                        <TableCell>
                          {org.employeeCountMin || org.employeeCountMax ? `${org.employeeCountMin ?? "?"}–${org.employeeCountMax ?? "?"}` : "—"}
                        </TableCell>
                        <TableCell>
                          {org.relationshipsAsTarget.length > 0
                            ? org.relationshipsAsTarget.map((r) => r.sourceOrganization.name).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {label(currentHoldStage(org.relationshipsAsTarget[0]?.investmentDate, org.investmentStageOverride))}
                        </TableCell>
                      </>
                    ) : isFundView ? (
                      <>
                        <TableCell>{hq || "—"}</TableCell>
                        <TableCell>{org.relationshipsAsSource.length}</TableCell>
                        <TableCell>{org._count.personAssociations}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{label(org.type)}</TableCell>
                        <TableCell>{hq || "—"}</TableCell>
                      </>
                    )}
                    <TableCell>
                      <StatusBadge value={org.status} />
                    </TableCell>
                    <TableCell>{label(org.accountPriority)}</TableCell>
                    <TableCell>
                      {org.relationshipOwner ? `${org.relationshipOwner.firstName} ${org.relationshipOwner.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="text-[var(--color-ink-subtle)]">
                      {org.lastVerifiedAt ? formatDistanceToNow(org.lastVerifiedAt, { addSuffix: true }) : "Never"}
                    </TableCell>
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
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`?${new URLSearchParams({ ...(typeParam ? { type: typeParam } : {}), page: String(page - 1) })}`}>Previous</Link>
              </Button>
            ) : null}
            {page * PAGE_SIZE < total ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`?${new URLSearchParams({ ...(typeParam ? { type: typeParam } : {}), page: String(page + 1) })}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
