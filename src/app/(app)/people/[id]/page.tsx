import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canArchiveRecord, canRestoreArchived, canViewAuditLog, canMergeRecords, canMutate } from "@/lib/permissions";
import { findPersonDuplicates } from "@/lib/duplicates";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { countryName } from "@/lib/iso";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { archivePersonAction, restorePersonAction } from "../actions";
import { EmploymentHistoryDialog } from "../employment-history-dialog";
import { CandidateProfileDialog } from "../candidate-profile-dialog";
import { MergeButton } from "../merge-button";
import { PracticeAreaPicker } from "../practice-area-picker";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const person = await prisma.person.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      relationshipOwner: true,
      createdBy: true,
      candidateProfile: true,
      currentOrganizationOverride: true,
      organizationAssociations: { include: { organization: true } },
      employmentHistories: { include: { organization: true }, orderBy: { startDate: "desc" } },
      practiceAreas: { include: { practiceArea: true } },
    },
  });
  if (!person) notFound();

  const [
    processes,
    activityLinks,
    taskLinks,
    documents,
    offLimits,
    auditLogs,
    organizations,
    duplicates,
    allPracticeAreas,
  ] = await Promise.all([
    prisma.candidateProcess.findMany({
      where: { candidatePersonId: person.id },
      include: { mandate: { include: { hiringOrganization: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activityPerson.findMany({
      where: { personId: person.id },
      include: { activity: { include: { createdBy: true } } },
      orderBy: { activity: { occurredAt: "desc" } },
      take: 30,
    }),
    prisma.taskPerson.findMany({
      where: { personId: person.id },
      include: { task: { include: { assignedUser: true } } },
      orderBy: { task: { dueDate: "asc" } },
    }),
    prisma.documentPerson.findMany({ where: { personId: person.id }, include: { document: true } }),
    prisma.offLimitsRestriction.findMany({ where: { personId: person.id }, orderBy: { createdAt: "desc" } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Person", entityId: person.id }, include: { actor: true }, orderBy: { timestamp: "desc" }, take: 50 })
      : Promise.resolve([]),
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canMergeRecords(user.role)
      ? findPersonDuplicates(user.workspaceId, { firstName: person.firstName, lastName: person.lastName, primaryEmail: person.primaryEmail, linkedinUrl: person.linkedinUrl }, person.id)
      : Promise.resolve([]),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  const canArchive = canArchiveRecord(user, { relationshipOwnerId: person.relationshipOwnerId, createdById: person.createdById });
  const canRestore = canRestoreArchived(user.role);
  const isCandidate = person.personTypes.includes("CANDIDATE");

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {person.firstName} {person.lastName}
            <StatusBadge value={person.relationshipStatus} />
            {person.doNotContact ? <Badge tone="danger">Do Not Contact</Badge> : null}
            {person.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{person.headlineOverride || person.employmentHistories.find((e) => e.isCurrent)?.jobTitle || "No current title"}</span>
            <span>{person.personTypes.map((t) => label(t)).join(", ")}</span>
            {person.relationshipOwner ? <span>Owner: {person.relationshipOwner.firstName} {person.relationshipOwner.lastName}</span> : null}
            {person.linkedinUrl ? (
              <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/activities/new?personId=${person.id}`}>Log activity</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/tasks/new?personId=${person.id}`}>Add task</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/people/${person.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isCandidate ? <TabsTrigger value="candidate">Candidate Profile</TabsTrigger> : null}
          <TabsTrigger value="employment">Employment History</TabsTrigger>
          <TabsTrigger value="processes">Processes ({processes.length})</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
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
                <h3 className="mb-2 text-sm font-semibold">Summary</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{person.summary || "No summary yet."}</p>

                {duplicates.length > 0 ? (
                  <div className="mt-4 rounded-md border border-[var(--color-status-warning-ink)] bg-[var(--color-status-warning-bg)] p-3">
                    <p className="mb-2 text-sm font-medium text-[var(--color-status-warning-ink)]">Possible duplicate records</p>
                    <ul className="flex flex-col gap-2">
                      {duplicates.map((d) => (
                        <li key={d.id} className="flex items-center justify-between text-sm">
                          <Link href={`/people/${d.id}`} className="text-[var(--color-accent)]">
                            {d.firstName} {d.lastName} — {d.reason}
                          </Link>
                          <MergeButton survivorId={person.id} duplicateId={d.id} duplicateName={`${d.firstName} ${d.lastName}`} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-subtle)]">Email</dt>
                    <dd>{person.primaryEmail || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-subtle)]">Phone</dt>
                    <dd>{person.primaryPhone || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-subtle)]">Location</dt>
                    <dd>{[person.city, person.countryCode ? countryName(person.countryCode) : null].filter(Boolean).join(", ") || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-subtle)]">Source</dt>
                    <dd>{person.source || "—"}</dd>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-[var(--color-ink-subtle)]">Practice areas</dt>
                    <dd>
                      <PracticeAreaPicker
                        personId={person.id}
                        allPracticeAreas={allPracticeAreas}
                        selectedIds={person.practiceAreas.map((pa) => pa.practiceAreaId)}
                        readOnly={!canMutate(user.role)}
                      />
                      {person.practiceAreas.length === 0 && !canMutate(user.role) ? (
                        <span className="text-[var(--color-ink-subtle)]">—</span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-subtle)]">Created by</dt>
                    <dd>{person.createdBy.firstName} {person.createdBy.lastName}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-col gap-2">
                  {canArchive && !person.archivedAt ? (
                    <form action={archivePersonAction.bind(null, person.id)}>
                      <Button type="submit" variant="outline" size="sm" className="w-full">
                        <Archive className="h-4 w-4" /> Archive
                      </Button>
                    </form>
                  ) : null}
                  {canRestore && person.archivedAt ? (
                    <form action={restorePersonAction.bind(null, person.id)}>
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

        {isCandidate ? (
          <TabsContent value="candidate">
            <div className="mb-3 flex justify-end">
              <CandidateProfileDialog
                personId={person.id}
                profile={
                  person.candidateProfile
                    ? {
                        status: person.candidateProfile.status,
                        rating: person.candidateProfile.rating,
                        currentBaseAmount: person.candidateProfile.currentBaseAmount?.toString() ?? null,
                        currentBaseCurrency: person.candidateProfile.currentBaseCurrency,
                        expectedBaseAmount: person.candidateProfile.expectedBaseAmount?.toString() ?? null,
                        expectedBaseCurrency: person.candidateProfile.expectedBaseCurrency,
                        noticePeriodValue: person.candidateProfile.noticePeriodValue,
                        noticePeriodUnit: person.candidateProfile.noticePeriodUnit,
                        careerSummary: person.candidateProfile.careerSummary,
                        motivation: person.candidateProfile.motivation,
                        consentStatus: person.candidateProfile.consentStatus,
                        legalBasis: person.candidateProfile.legalBasis,
                      }
                    : null
                }
              />
            </div>
            {!person.candidateProfile ? (
              <EmptyState title="No candidate profile yet" description="Create one to track compensation, availability and consent." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-semibold">Status</h3>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Status</dt><dd><StatusBadge value={person.candidateProfile.status} /></dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Rating</dt><dd>{label(person.candidateProfile.rating)}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Last qualified</dt><dd>{person.candidateProfile.lastQualifiedAt ? format(person.candidateProfile.lastQualifiedAt, "d MMM yyyy") : "—"}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-semibold">Compensation</h3>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Current base</dt><dd>{formatMoney(person.candidateProfile.currentBaseAmount, person.candidateProfile.currentBaseCurrency)}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Expected base</dt><dd>{formatMoney(person.candidateProfile.expectedBaseAmount, person.candidateProfile.expectedBaseCurrency)}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Notice period</dt><dd>{person.candidateProfile.noticePeriodValue ? `${person.candidateProfile.noticePeriodValue} ${person.candidateProfile.noticePeriodUnit ?? ""}` : "—"}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2">
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-semibold">Career summary</h3>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{person.candidateProfile.careerSummary || "—"}</p>
                    <h3 className="mb-2 mt-4 text-sm font-semibold">Motivation</h3>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{person.candidateProfile.motivation || "—"}</p>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2">
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-semibold">Privacy &amp; consent</h3>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Consent status</dt><dd>{label(person.candidateProfile.consentStatus)}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Legal basis</dt><dd>{label(person.candidateProfile.legalBasis)}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="employment">
          <div className="mb-3 flex justify-end">
            <EmploymentHistoryDialog personId={person.id} organizations={organizations} />
          </div>
          {person.employmentHistories.length === 0 ? (
            <EmptyState title="No employment history recorded" />
          ) : (
            <div className="flex flex-col gap-2">
              {person.employmentHistories.map((e) => (
                <Card key={e.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{e.jobTitle}</p>
                        <p className="text-sm text-[var(--color-ink-subtle)]">{e.organization?.name ?? e.employerNameFallback ?? "Unknown employer"}</p>
                      </div>
                      {e.isCurrent ? <Badge tone="success">Current</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {e.startDate ? format(e.startDate, "MMM yyyy") : "?"} – {e.isCurrent ? "Present" : e.endDate ? format(e.endDate, "MMM yyyy") : "?"}
                      {e.seniority ? ` · ${label(e.seniority)}` : ""}
                      {e.workArrangement ? ` · ${label(e.workArrangement)}` : ""}
                    </p>
                    {e.responsibilities ? <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{e.responsibilities}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processes">
          {processes.length === 0 ? (
            <EmptyState title="Not on any candidate pipelines yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/mandates/${p.mandateId}`} className="text-[var(--color-accent)]">
                        {p.mandate.reference} — {p.mandate.title}
                      </Link>
                    </TableCell>
                    <TableCell>{p.mandate.hiringOrganization.name}</TableCell>
                    <TableCell>
                      <StatusBadge value={p.stage} />
                    </TableCell>
                    <TableCell>{format(p.updatedAt, "d MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="relationships">
          {person.organizationAssociations.length === 0 ? (
            <EmptyState title="No organisation relationships" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Stakeholder role</TableHead>
                  <TableHead>Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {person.organizationAssociations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/organisations/${a.organizationId}`} className="text-[var(--color-accent)]">
                        {a.organization.name}
                      </Link>
                    </TableCell>
                    <TableCell>{a.stakeholderRoles.map((r) => label(r)).join(", ") || "—"}</TableCell>
                    <TableCell>{a.isCurrent ? "Current" : "Past"}</TableCell>
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
                    <TableCell>{link.task.title}</TableCell>
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
            <UploadDocumentDialog linkField="personId" linkId={person.id} />
          </div>
          {documents.length === 0 ? (
            <EmptyState title="No documents" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <a href={`/api/documents/${d.documentId}/download`} className="text-[var(--color-accent)]">
                        {d.document.displayName}
                      </a>
                    </TableCell>
                    <TableCell>{label(d.document.category)}</TableCell>
                    <TableCell>
                      v{d.document.versionNumber} {d.document.isCurrentVersion ? <Badge tone="success">Current</Badge> : null}
                    </TableCell>
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
