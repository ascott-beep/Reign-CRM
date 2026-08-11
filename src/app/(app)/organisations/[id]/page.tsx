import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canArchiveRecord, canRestoreArchived, canViewAuditLog } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline } from "@/components/ui/timeline";
import { RelatedOrgCard } from "@/components/ui/related-org-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { countryName } from "@/lib/iso";
import { formatMoney } from "@/lib/utils";
import { getOrganizationTimeline } from "@/lib/timeline";
import { format } from "date-fns";
import { forwardRelationshipLabel, inverseRelationshipLabel } from "@/lib/relationship-labels";
import { archiveOrganizationAction, restoreOrganizationAction } from "../actions";
import { AddRelationshipDialog } from "../add-relationship-dialog";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { LogActivityDialog } from "../../activities/log-activity-dialog";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const org = await prisma.organization.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      relationshipOwner: true,
      createdBy: true,
      sectors: { include: { sector: true } },
      investorStrategies: { include: { strategy: true } },
      ownershipType: true,
      tags: { include: { tag: true } },
      relationshipsAsSource: { include: { targetOrganization: true }, orderBy: { createdAt: "desc" } },
      relationshipsAsTarget: { include: { sourceOrganization: true }, orderBy: { createdAt: "desc" } },
      personAssociations: { include: { person: true }, orderBy: { isPrimaryContact: "desc" } },
    },
  });
  if (!org) notFound();

  const investorFundIds = org.relationshipsAsTarget.map((r) => r.sourceOrganizationId);

  const [timeline, opportunities, mandates, intelligence, documents, auditLogs, allOrgsForRelationship, users, siblingRelationships] = await Promise.all([
    getOrganizationTimeline(org.id),
    prisma.opportunity.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.mandate.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.intelligenceItem.findMany({ where: { organizationId: org.id, archivedAt: null }, orderBy: { dateReceived: "desc" } }),
    prisma.documentOrganization.findMany({ where: { organizationId: org.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({
          where: { entityType: "Organization", entityId: org.id },
          include: { actor: true },
          orderBy: { timestamp: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.organization.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, id: { not: org.id } },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    investorFundIds.length > 0
      ? prisma.organizationRelationship.findMany({
          where: { sourceOrganizationId: { in: investorFundIds }, targetOrganizationId: { not: org.id } },
          include: { targetOrganization: true, sourceOrganization: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // A sibling portco can show up once per shared investor fund — keep only the first (most recent) row per company.
  // Filtered to actual portfolio companies since a fund's outbound relationships can also include things like
  // co-investor funds, which don't belong under "other portfolio companies."
  const siblingPortcos = Array.from(
    new Map(
      siblingRelationships.filter((r) => r.targetOrganization.type === "PORTFOLIO_COMPANY").map((r) => [r.targetOrganizationId, r]),
    ).values(),
  );

  const canArchive = canArchiveRecord(user, { relationshipOwnerId: org.relationshipOwnerId, createdById: org.createdById });
  const canRestore = canRestoreArchived(user.role);

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {org.name}
            <StatusBadge value={org.status} />
            {org.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{label(org.type)}</span>
            <span>Priority: {label(org.accountPriority)}</span>
            {org.relationshipOwner ? <span>Owner: {org.relationshipOwner.firstName} {org.relationshipOwner.lastName}</span> : null}
            {org.website ? (
              <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                Website <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {org.linkedinUrl ? (
              <a href={org.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {org.tags.map((t) => (
              <Badge key={t.tagId} tone="info">
                {t.tag.name}
              </Badge>
            ))}
          </div>
        }
        actions={
          <>
            <LogActivityDialog
              users={users}
              currentUserId={user.id}
              linkContext={{ organizationId: org.id, label: org.name }}
            />
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/people/new?organizationId=${org.id}`}>Add person</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/opportunities/new?organizationId=${org.id}`}>Add opportunity</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/tasks/new?organizationId=${org.id}`}>Add task</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/organisations/${org.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">Investments &amp; Relationships</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="mandates">Mandates ({mandates.length})</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence ({intelligence.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-2 text-sm font-semibold">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{org.description || "No description yet."}</p>
                  {org.internalSummary ? (
                    <>
                      <h3 className="mb-2 mt-4 text-sm font-semibold">Internal summary</h3>
                      <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{org.internalSummary}</p>
                    </>
                  ) : null}

                  {org.type === "PE_FUND" ? (
                    <>
                      <h3 className="mb-2 mt-4 text-sm font-semibold">Fund</h3>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-[var(--color-ink-subtle)]">Current fund / vintage</dt>
                        <dd>{org.fundVintageOrCurrentFundName || "—"}</dd>
                        <dt className="text-[var(--color-ink-subtle)]">AUM</dt>
                        <dd>{formatMoney(org.aumAmount, org.aumCurrency)}</dd>
                        <dt className="text-[var(--color-ink-subtle)]">Strategies</dt>
                        <dd>{org.investorStrategies.map((s) => s.strategy.name).join(", ") || "—"}</dd>
                      </dl>
                      <h3 className="mb-2 mt-4 text-sm font-semibold">Current &amp; exited portfolio</h3>
                      {org.relationshipsAsSource.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-subtle)]">No portfolio relationships recorded yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {org.relationshipsAsSource.map((r) => (
                            <RelatedOrgCard
                              key={r.id}
                              id={r.targetOrganizationId}
                              name={r.targetOrganization.name}
                              type={r.targetOrganization.type}
                              subtitle={forwardRelationshipLabel(r.type)}
                              investmentStatus={r.investmentStatus}
                              date={r.investmentDate}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}

                  {org.type === "PORTFOLIO_COMPANY" ? (
                    <>
                      <h3 className="mb-2 mt-4 text-sm font-semibold">Current &amp; former investors</h3>
                      {org.relationshipsAsTarget.length === 0 ? (
                        <p className="text-sm text-[var(--color-ink-subtle)]">No investor relationships recorded yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {org.relationshipsAsTarget.map((r) => (
                            <RelatedOrgCard
                              key={r.id}
                              id={r.sourceOrganizationId}
                              name={r.sourceOrganization.name}
                              type={r.sourceOrganization.type}
                              subtitle={inverseRelationshipLabel(r.type)}
                              investmentStatus={r.investmentStatus}
                              date={r.investmentDate}
                            />
                          ))}
                        </div>
                      )}

                      {siblingPortcos.length > 0 ? (
                        <>
                          <h3 className="mb-2 mt-4 text-sm font-semibold">Other portfolio companies from the same investor{siblingPortcos.length === 1 ? "" : "s"}</h3>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {siblingPortcos.map((r) => (
                              <RelatedOrgCard
                                key={r.id}
                                id={r.targetOrganizationId}
                                name={r.targetOrganization.name}
                                type={r.targetOrganization.type}
                                subtitle={`via ${r.sourceOrganization.name}`}
                                investmentStatus={r.investmentStatus}
                                date={r.investmentDate}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}

                      <h3 className="mb-2 mt-4 text-sm font-semibold">Investment thesis</h3>
                      <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{org.investmentThesisSummary || "—"}</p>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-3.5 text-sm font-semibold">Activity</h3>
                  <Timeline items={timeline} emptyLabel="Nothing logged yet — use “Log activity” above to record a call, email, or note." />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-2 text-sm font-semibold">Details</h3>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Headquarters</dt>
                      <dd>{[org.hqCity, org.hqCountryCode ? countryName(org.hqCountryCode) : null].filter(Boolean).join(", ") || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Employees</dt>
                      <dd>{org.employeeCountMin || org.employeeCountMax ? `${org.employeeCountMin ?? "?"}–${org.employeeCountMax ?? "?"}` : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Ownership</dt>
                      <dd>{org.ownershipType?.name || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Sector</dt>
                      <dd>{org.sectors.map((s) => s.sector.name).join(", ") || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Source</dt>
                      <dd>{org.source || "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Created by</dt>
                      <dd>{org.createdBy.firstName} {org.createdBy.lastName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-ink-subtle)]">Last verified</dt>
                      <dd>{org.lastVerifiedAt ? format(org.lastVerifiedAt, "d MMM yyyy") : "Never"}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-col gap-2">
                    {canArchive && !org.archivedAt ? (
                      <form action={archiveOrganizationAction.bind(null, org.id)}>
                        <Button type="submit" variant="outline" size="sm" className="w-full">
                          <Archive className="h-4 w-4" /> Archive
                        </Button>
                      </form>
                    ) : null}
                    {canRestore && org.archivedAt ? (
                      <form action={restoreOrganizationAction.bind(null, org.id)}>
                        <Button type="submit" variant="outline" size="sm" className="w-full">
                          <ArchiveRestore className="h-4 w-4" /> Restore
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-2 text-sm font-semibold">People ({org.personAssociations.length})</h3>
                  {org.personAssociations.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-subtle)]">No people linked.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {org.personAssociations.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                          <Link href={`/people/${a.personId}`} className="min-w-0 truncate text-[var(--color-accent)] hover:underline">
                            {a.person.firstName} {a.person.lastName}
                            {a.isPrimaryContact ? <span className="ml-1.5 text-xs text-[var(--color-ink-subtle)]">(Primary)</span> : null}
                          </Link>
                          <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">{a.stakeholderRoles.map((r) => label(r)).join(", ") || "—"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="relationships">
          <div className="mb-3 flex justify-end">
            <AddRelationshipDialog organizationId={org.id} organizations={allOrgsForRelationship} />
          </div>
          {org.relationshipsAsSource.length === 0 && org.relationshipsAsTarget.length === 0 ? (
            <EmptyState title="No relationships yet" description="Connect this organisation to funds or portfolio companies." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Investment Date</TableHead>
                  <TableHead>Exit Date</TableHead>
                  <TableHead>Ownership %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.relationshipsAsSource.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/organisations/${r.targetOrganizationId}`} className="text-[var(--color-accent)]">
                        {r.targetOrganization.name}
                      </Link>
                    </TableCell>
                    <TableCell>{forwardRelationshipLabel(r.type)}</TableCell>
                    <TableCell>{r.investmentStatus ? label(r.investmentStatus) : "—"}</TableCell>
                    <TableCell>{r.investmentDate ? format(r.investmentDate, "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>{r.exitDate ? format(r.exitDate, "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>{r.ownershipPercentage ? `${r.ownershipPercentage}%` : "—"}</TableCell>
                  </TableRow>
                ))}
                {org.relationshipsAsTarget.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/organisations/${r.sourceOrganizationId}`} className="text-[var(--color-accent)]">
                        {r.sourceOrganization.name}
                      </Link>
                    </TableCell>
                    <TableCell>{inverseRelationshipLabel(r.type)}</TableCell>
                    <TableCell>{r.investmentStatus ? label(r.investmentStatus) : "—"}</TableCell>
                    <TableCell>{r.investmentDate ? format(r.investmentDate, "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>{r.exitDate ? format(r.exitDate, "d MMM yyyy") : "—"}</TableCell>
                    <TableCell>{r.ownershipPercentage ? `${r.ownershipPercentage}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="opportunities">
          {opportunities.length === 0 ? (
            <EmptyState title="No opportunities" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Estimated fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/opportunities/${o.id}`} className="text-[var(--color-accent)]">
                        {o.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={o.stage} />
                    </TableCell>
                    <TableCell>{formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="mandates">
          {mandates.length === 0 ? (
            <EmptyState title="No mandates" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.reference}</TableCell>
                    <TableCell>
                      <Link href={`/mandates/${m.id}`} className="text-[var(--color-accent)]">
                        {m.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={m.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="intelligence">
          {intelligence.length === 0 ? (
            <EmptyState title="No intelligence recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Relevance</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intelligence.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link href={`/intelligence/${i.id}`} className="text-[var(--color-accent)]">
                        {i.title}
                      </Link>
                    </TableCell>
                    <TableCell>{label(i.type)}</TableCell>
                    <TableCell>{label(i.commercialRelevance)}</TableCell>
                    <TableCell>{format(i.dateReceived, "d MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="mb-3 flex justify-end">
            <UploadDocumentDialog linkField="organizationId" linkId={org.id} />
          </div>
          {documents.length === 0 ? (
            <EmptyState title="No documents" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <a href={`/api/documents/${d.documentId}/download`} className="text-[var(--color-accent)]">
                        {d.document.displayName}
                      </a>
                      {d.document.restricted ? (
                        <Badge tone="warning" className="ml-2">
                          Restricted
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{label(d.document.category)}</TableCell>
                    <TableCell>{format(d.document.uploadedAt, "d MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {canViewAuditLog(user.role) ? (
          <TabsContent value="audit">
            {auditLogs.length === 0 ? (
              <EmptyState title="No audit history" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{label(a.action)}</TableCell>
                      <TableCell>{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System"}</TableCell>
                      <TableCell>{format(a.timestamp, "d MMM yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
