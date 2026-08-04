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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { countryName, CURRENCIES } from "@/lib/iso";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { forwardRelationshipLabel, inverseRelationshipLabel } from "@/lib/relationship-labels";
import { archiveOrganizationAction, restoreOrganizationAction } from "../actions";
import { AddRelationshipDialog } from "../add-relationship-dialog";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
void CURRENCIES;

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

  const [opportunities, mandates, intelligence, activityLinks, taskLinks, documents, offLimits, auditLogs, allOrgsForRelationship] =
    await Promise.all([
      prisma.opportunity.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
      prisma.mandate.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
      prisma.intelligenceItem.findMany({ where: { organizationId: org.id, archivedAt: null }, orderBy: { dateReceived: "desc" } }),
      prisma.activityOrganization.findMany({
        where: { organizationId: org.id },
        include: { activity: { include: { createdBy: true } } },
        orderBy: { activity: { occurredAt: "desc" } },
        take: 30,
      }),
      prisma.taskOrganization.findMany({
        where: { organizationId: org.id },
        include: { task: { include: { assignedUser: true } } },
        orderBy: { task: { dueDate: "asc" } },
      }),
      prisma.documentOrganization.findMany({ where: { organizationId: org.id }, include: { document: true } }),
      prisma.offLimitsRestriction.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" } }),
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
    ]);

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
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/activities/new?organizationId=${org.id}`}>Log activity</Link>
            </Button>
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
          <TabsTrigger value="people">People ({org.personAssociations.length})</TabsTrigger>
          <TabsTrigger value="relationships">Investments &amp; Relationships</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="mandates">Mandates ({mandates.length})</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence ({intelligence.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="offlimits">Off Limits</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
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
                      <ul className="flex flex-col gap-1">
                        {org.relationshipsAsSource.map((r) => (
                          <li key={r.id} className="flex items-center justify-between text-sm">
                            <Link href={`/organisations/${r.targetOrganizationId}`} className="text-[var(--color-accent)]">
                              {r.targetOrganization.name}
                            </Link>
                            <span className="text-xs text-[var(--color-ink-subtle)]">
                              {forwardRelationshipLabel(r.type)}
                              {r.investmentDate ? ` · ${format(r.investmentDate, "MMM yyyy")}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : null}

                {org.type === "PORTFOLIO_COMPANY" ? (
                  <>
                    <h3 className="mb-2 mt-4 text-sm font-semibold">Current &amp; former investors</h3>
                    {org.relationshipsAsTarget.length === 0 ? (
                      <p className="text-sm text-[var(--color-ink-subtle)]">No investor relationships recorded yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {org.relationshipsAsTarget.map((r) => (
                          <li key={r.id} className="flex items-center justify-between text-sm">
                            <Link href={`/organisations/${r.sourceOrganizationId}`} className="text-[var(--color-accent)]">
                              {r.sourceOrganization.name}
                            </Link>
                            <span className="text-xs text-[var(--color-ink-subtle)]">
                              {inverseRelationshipLabel(r.type)}
                              {r.investmentDate ? ` · ${format(r.investmentDate, "MMM yyyy")}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <h3 className="mb-2 mt-4 text-sm font-semibold">Investment thesis</h3>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{org.investmentThesisSummary || "—"}</p>
                  </>
                ) : null}
              </CardContent>
            </Card>
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
          </div>
        </TabsContent>

        <TabsContent value="people">
          {org.personAssociations.length === 0 ? (
            <EmptyState title="No people linked" description="Add a stakeholder to track relationships at this organisation." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stakeholder role</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.personAssociations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/people/${a.personId}`} className="text-[var(--color-accent)]">
                        {a.person.firstName} {a.person.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{a.stakeholderRoles.map((r) => label(r)).join(", ") || "—"}</TableCell>
                    <TableCell>{a.isPrimaryContact ? "Yes" : ""}</TableCell>
                    <TableCell>{a.isCurrent ? "Current" : "Past"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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

        <TabsContent value="activity">
          {activityLinks.length === 0 ? (
            <EmptyState title="No activity logged yet" />
          ) : (
            <div className="flex flex-col gap-2">
              {activityLinks.map((link) => (
                <Card key={link.id}>
                  <CardContent className="flex items-start justify-between gap-4 pt-4 text-sm">
                    <div>
                      <p className="font-medium">{link.activity.subject || label(link.activity.type)}</p>
                      <p className="mt-0.5 text-[var(--color-ink-subtle)]">{link.activity.summary}</p>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-[var(--color-ink-subtle)]">
                      <p>{format(link.activity.occurredAt, "d MMM yyyy")}</p>
                      <p>{link.activity.createdBy.firstName} {link.activity.createdBy.lastName}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {taskLinks.length === 0 ? (
            <EmptyState title="No tasks linked" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <Link href="/tasks" className="text-[var(--color-accent)]">
                        {link.task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={link.task.status} />
                    </TableCell>
                    <TableCell>{format(link.task.dueDate, "d MMM yyyy")}</TableCell>
                    <TableCell>{link.task.assignedUser.firstName} {link.task.assignedUser.lastName}</TableCell>
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

        <TabsContent value="offlimits">
          {offLimits.length === 0 ? (
            <EmptyState title="No off-limits restrictions" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offLimits.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{label(o.type)}</TableCell>
                    <TableCell>
                      <Badge tone={o.severity === "BLOCK" ? "danger" : "warning"}>{label(o.severity)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">{o.reason}</TableCell>
                    <TableCell>{(o.activeOverride ?? (!o.endDate || o.endDate > new Date())) ? "Active" : "Expired"}</TableCell>
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
