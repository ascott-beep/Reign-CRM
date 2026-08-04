import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowRightCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { convertOpportunityToMandateAction } from "../actions";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { StageSelect } from "../stage-select";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const opportunity = await prisma.opportunity.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      hiringOrganization: true,
      owner: true,
      createdBy: true,
      leadContactPerson: true,
      sourcePerson: true,
      relatedFunds: { include: { organization: true } },
      stakeholders: { include: { person: true } },
      stageHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } },
      wonMandate: true,
    },
  });
  if (!opportunity) notFound();

  const [activityLinks, taskLinks, documents, offLimits, auditLogs] = await Promise.all([
    prisma.activityOpportunity.findMany({
      where: { opportunityId: opportunity.id },
      include: { activity: { include: { createdBy: true } } },
      orderBy: { activity: { occurredAt: "desc" } },
    }),
    prisma.taskOpportunity.findMany({ where: { opportunityId: opportunity.id }, include: { task: { include: { assignedUser: true } } }, orderBy: { task: { dueDate: "asc" } } }),
    prisma.documentOpportunity.findMany({ where: { opportunityId: opportunity.id }, include: { document: true } }),
    prisma.offLimitsRestriction.findMany({ where: { organizationId: opportunity.hiringOrganizationId }, take: 5 }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Opportunity", entityId: opportunity.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
  ]);

  const probability = opportunity.isProbabilityOverridden ? (opportunity.probabilityOverride ?? 0) : (OPPORTUNITY_STAGE_PROBABILITY[opportunity.stage] ?? 0);

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {opportunity.name}
            <StatusBadge value={opportunity.stage} />
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/organisations/${opportunity.hiringOrganizationId}`} className="text-[var(--color-accent)]">
              {opportunity.hiringOrganization.name}
            </Link>
            <span>Probability: {probability}%</span>
            <span>Estimated value: {formatMoney(opportunity.estimatedFeeAmount, opportunity.estimatedFeeCurrency)}</span>
            <span>Owner: {opportunity.owner.firstName} {opportunity.owner.lastName}</span>
          </div>
        }
        actions={
          <>
            <StageSelect opportunityId={opportunity.id} currentStage={opportunity.stage} />
            {opportunity.stage === "WON" && !opportunity.wonMandateId ? (
              <form action={convertOpportunityToMandateAction.bind(null, opportunity.id)}>
                <Button type="submit">
                  <ArrowRightCircle className="h-4 w-4" /> Convert to Mandate
                </Button>
              </form>
            ) : null}
            {opportunity.wonMandateId ? (
              <Button variant="secondary" asChild>
                <Link href={`/mandates/${opportunity.wonMandateId}`}>View Mandate</Link>
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/opportunities/${opportunity.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders ({opportunity.stakeholders.length})</TabsTrigger>
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
                <h3 className="mb-2 text-sm font-semibold">Next step</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{opportunity.nextStepSummary || "—"}</p>
                <h3 className="mb-2 mt-4 text-sm font-semibold">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{opportunity.notes || "—"}</p>
                {opportunity.stage === "LOST" ? (
                  <>
                    <h3 className="mb-2 mt-4 text-sm font-semibold">Loss reason</h3>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {label(opportunity.lossReason)} {opportunity.lossExplanation ? `— ${opportunity.lossExplanation}` : ""}
                    </p>
                  </>
                ) : null}
                {opportunity.stage === "ON_HOLD" && opportunity.onHoldReason ? (
                  <>
                    <h3 className="mb-2 mt-4 text-sm font-semibold">On-hold reason</h3>
                    <p className="text-sm text-[var(--color-ink-muted)]">{opportunity.onHoldReason}</p>
                  </>
                ) : null}

                <h3 className="mb-2 mt-4 text-sm font-semibold">Stage history</h3>
                <ul className="flex flex-col gap-1.5">
                  {opportunity.stageHistory.map((h) => (
                    <li key={h.id} className="flex items-center justify-between text-sm">
                      <span>
                        {h.fromStage ? `${label(h.fromStage)} → ` : ""}
                        {label(h.toStage)}
                      </span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">
                        {format(h.changedAt, "d MMM yyyy HH:mm")} · {h.changedBy.firstName} {h.changedBy.lastName}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Type</dt><dd>{label(opportunity.type)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Role</dt><dd>{opportunity.potentialRoleTitle || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Source</dt><dd>{label(opportunity.source)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Lead contact</dt><dd>{opportunity.leadContactPerson ? `${opportunity.leadContactPerson.firstName} ${opportunity.leadContactPerson.lastName}` : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Related funds</dt><dd>{opportunity.relatedFunds.map((f) => f.organization.name).join(", ") || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Expected decision</dt><dd>{opportunity.expectedDecisionDate ? format(opportunity.expectedDecisionDate, "d MMM yyyy") : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Created by</dt><dd>{opportunity.createdBy.firstName} {opportunity.createdBy.lastName}</dd></div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stakeholders">
          {opportunity.stakeholders.length === 0 ? (
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
                {opportunity.stakeholders.map((s) => (
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
            <UploadDocumentDialog linkField="opportunityId" linkId={opportunity.id} />
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
            <EmptyState title="No off-limits restrictions on this organisation" />
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
