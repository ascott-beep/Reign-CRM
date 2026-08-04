import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewMandate, canViewAuditLog } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { archiveMandateAction } from "../actions";
import { ProcessBoard, type BoardProcess } from "../process-board";
import { AddCandidateDialog } from "../add-candidate-dialog";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { MandateStatusSelect } from "../status-select";

export default async function MandateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  if (!(await canViewMandate(user, id))) {
    return <PermissionDeniedState description="This mandate is highly confidential and you are not assigned to it." />;
  }

  const mandate = await prisma.mandate.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      hiringOrganization: true,
      owner: true,
      createdBy: true,
      hiringManagerPerson: true,
      internalTalentPerson: true,
      relatedFunds: { include: { organization: true } },
      stakeholders: { include: { person: true } },
      assignedUsers: { include: { user: true } },
      statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } },
      candidateProcesses: { include: { candidatePerson: { include: { candidateProfile: true } } }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!mandate) notFound();

  const [interviews, activityLinks, taskLinks, documents, offLimits, auditLogs, allCandidates] = await Promise.all([
    prisma.interview.findMany({
      where: { candidateProcess: { mandateId: mandate.id } },
      include: { candidateProcess: { include: { candidatePerson: true } } },
      orderBy: { scheduledStart: "desc" },
    }),
    prisma.activityMandate.findMany({ where: { mandateId: mandate.id }, include: { activity: { include: { createdBy: true } } }, orderBy: { activity: { occurredAt: "desc" } } }),
    prisma.taskMandate.findMany({ where: { mandateId: mandate.id }, include: { task: { include: { assignedUser: true } } }, orderBy: { task: { dueDate: "asc" } } }),
    prisma.documentMandate.findMany({ where: { mandateId: mandate.id }, include: { document: true } }),
    prisma.offLimitsRestriction.findMany({ where: { OR: [{ organizationId: mandate.hiringOrganizationId }, { mandateId: mandate.id }] } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Mandate", entityId: mandate.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, personTypes: { has: "CANDIDATE" } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const boardData: BoardProcess[] = mandate.candidateProcesses.map((p) => ({
    id: p.id,
    stage: p.stage,
    candidateName: `${p.candidatePerson.firstName} ${p.candidatePerson.lastName}`,
    candidateRating: p.candidatePerson.candidateProfile?.rating ?? null,
    overallScore: p.overallScore,
  }));

  const stageCounts = mandate.candidateProcesses.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {mandate.reference} — {mandate.title}
            <StatusBadge value={mandate.status} />
            {mandate.confidentiality !== "OPEN" ? <Badge tone="warning">{label(mandate.confidentiality)}</Badge> : null}
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/organisations/${mandate.hiringOrganizationId}`} className="text-[var(--color-accent)]">
              {mandate.hiringOrganization.name}
            </Link>
            <span>Priority: {label(mandate.priority)}</span>
            <span>Owner: {mandate.owner.firstName} {mandate.owner.lastName}</span>
            <span>{formatMoney(mandate.minBaseAmount, mandate.baseCurrency)} – {formatMoney(mandate.maxBaseAmount, mandate.baseCurrency)}</span>
          </div>
        }
        actions={
          <>
            <MandateStatusSelect mandateId={mandate.id} currentStatus={mandate.status} />
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/activities/new?mandateId=${mandate.id}`}>Log activity</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/tasks/new?mandateId=${mandate.id}`}>Add task</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/mandates/${mandate.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <form action={archiveMandateAction.bind(null, mandate.id)}>
              <Button type="submit" variant="outline" size="sm">
                <Archive className="h-4 w-4" />
              </Button>
            </form>
          </>
        }
      />

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="pipeline">Candidate Pipeline ({mandate.candidateProcesses.length})</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="offlimits">Off Limits</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="brief">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="pt-4">
                <h3 className="mb-2 text-sm font-semibold">Role summary</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{mandate.roleSummary || "—"}</p>
                <h3 className="mb-2 mt-4 text-sm font-semibold">Business context</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{mandate.businessContext || "—"}</p>
                <h3 className="mb-2 mt-4 text-sm font-semibold">Required experience</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{mandate.requiredExperience || "—"}</p>
                <h3 className="mb-2 mt-4 text-sm font-semibold">Assessment criteria</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{mandate.assessmentCriteria || "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Seniority</dt><dd>{mandate.seniority ? label(mandate.seniority) : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Employment type</dt><dd>{label(mandate.employmentType)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Location</dt><dd>{mandate.city || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Work arrangement</dt><dd>{mandate.workArrangement ? label(mandate.workArrangement) : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Number of hires</dt><dd>{mandate.numberOfHires}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Hiring manager</dt><dd>{mandate.hiringManagerPerson ? `${mandate.hiringManagerPerson.firstName} ${mandate.hiringManagerPerson.lastName}` : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Internal talent/HR</dt><dd>{mandate.internalTalentPerson ? `${mandate.internalTalentPerson.firstName} ${mandate.internalTalentPerson.lastName}` : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Related funds</dt><dd>{mandate.relatedFunds.map((f) => f.organization.name).join(", ") || "—"}</dd></div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2 text-xs text-[var(--color-ink-subtle)]">
              {Object.entries(stageCounts).map(([stage, count]) => (
                <span key={stage}>
                  {label(stage)}: {count}
                </span>
              ))}
            </div>
            <AddCandidateDialog mandateId={mandate.id} candidates={allCandidates} />
          </div>
          {mandate.candidateProcesses.length === 0 ? (
            <EmptyState title="No candidates in this pipeline yet" />
          ) : (
            <ProcessBoard
              key={mandate.candidateProcesses
                .map((p) => p.id)
                .sort()
                .join(",")}
              initialProcesses={boardData}
            />
          )}
        </TabsContent>

        <TabsContent value="stakeholders">
          {mandate.stakeholders.length === 0 ? (
            <EmptyState title="No stakeholders recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandate.stakeholders.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/people/${s.personId}`} className="text-[var(--color-accent)]">
                        {s.person.firstName} {s.person.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{label(s.role)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {mandate.assignedUsers.length > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">Assigned team</h3>
              <div className="flex gap-2">
                {mandate.assignedUsers.map((a) => (
                  <Badge key={a.id} tone="neutral">
                    {a.user.firstName} {a.user.lastName}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="interviews">
          {interviews.length === 0 ? (
            <EmptyState title="No interviews scheduled" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.candidateProcess.candidatePerson.firstName} {i.candidateProcess.candidatePerson.lastName}</TableCell>
                    <TableCell>{label(i.type)}</TableCell>
                    <TableCell>{i.roundNumber}</TableCell>
                    <TableCell>{format(i.scheduledStart, "d MMM yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <StatusBadge value={i.outcome} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="commercial">
          <Card>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Engagement model</dt><dd>{label(mandate.engagementModel)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Fee type</dt><dd>{label(mandate.feeType)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Fee percentage</dt><dd>{mandate.feePercentage ? `${mandate.feePercentage}%` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Base range</dt><dd>{formatMoney(mandate.minBaseAmount, mandate.baseCurrency)} – {formatMoney(mandate.maxBaseAmount, mandate.baseCurrency)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Signed terms</dt><dd>{mandate.signedTerms ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Exclusivity</dt><dd>{mandate.exclusivity ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Guarantee</dt><dd>{mandate.guaranteeValue ? `${mandate.guaranteeValue} ${mandate.guaranteeUnit}` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Target completion</dt><dd>{mandate.targetCompletionDate ? format(mandate.targetCompletionDate, "d MMM yyyy") : "—"}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Status history</h3>
            <ul className="flex flex-col gap-1.5">
              {mandate.statusHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span>
                    {h.fromStatus ? `${label(h.fromStatus)} → ` : ""}
                    {label(h.toStatus)}
                  </span>
                  <span className="text-xs text-[var(--color-ink-subtle)]">
                    {format(h.changedAt, "d MMM yyyy HH:mm")} · {h.changedBy.firstName} {h.changedBy.lastName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
                    <p className="whitespace-nowrap text-xs text-[var(--color-ink-subtle)]">{format(link.activity.occurredAt, "d MMM yyyy")}</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.task.title}</TableCell>
                    <TableCell><StatusBadge value={link.task.status} /></TableCell>
                    <TableCell>{format(link.task.dueDate, "d MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="mb-3 flex justify-end">
            <UploadDocumentDialog linkField="mandateId" linkId={mandate.id} />
          </div>
          {documents.length === 0 ? (
            <EmptyState title="No documents" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
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
            <div className="flex flex-col gap-2">
              {offLimits.map((o) => (
                <Badge key={o.id} tone={o.severity === "BLOCK" ? "danger" : "warning"}>
                  {label(o.type)}: {o.reason}
                </Badge>
              ))}
            </div>
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
