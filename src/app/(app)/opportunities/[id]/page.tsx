import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { NextActionCard } from "@/components/ui/next-action-card";
import { Timeline } from "@/components/ui/timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getOpportunityTimeline } from "@/lib/timeline";
import { format } from "date-fns";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { LogActivityDialog } from "../../activities/log-activity-dialog";
import { StageSelect } from "../stage-select";
import { ConvertToMandateButton } from "../convert-to-mandate-button";

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
      wonMandate: true,
      primaryNextTask: { include: { assignedUser: true } },
    },
  });
  if (!opportunity) notFound();

  const [timeline, documents, auditLogs, users] = await Promise.all([
    getOpportunityTimeline(opportunity.id),
    prisma.documentOpportunity.findMany({ where: { opportunityId: opportunity.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Opportunity", entityId: opportunity.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
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
            <StageSelect
              opportunityId={opportunity.id}
              currentStage={opportunity.stage}
              context={`${opportunity.potentialRoleTitle ?? opportunity.name} · ${opportunity.hiringOrganization.name}${opportunity.estimatedFeeAmount ? ` · ${formatMoney(opportunity.estimatedFeeAmount, opportunity.estimatedFeeCurrency)}` : ""}`}
            />
            {opportunity.stage === "WON" && !opportunity.wonMandateId ? <ConvertToMandateButton opportunityId={opportunity.id} /> : null}
            {opportunity.wonMandateId ? (
              <Button variant="secondary" asChild>
                <Link href={`/mandates/${opportunity.wonMandateId}`}>View Mandate</Link>
              </Button>
            ) : null}
            <LogActivityDialog
              users={users}
              currentUserId={user.id}
              linkContext={{ opportunityId: opportunity.id, label: opportunity.name }}
            />
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
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <NextActionCard
                task={
                  opportunity.primaryNextTask
                    ? {
                        id: opportunity.primaryNextTask.id,
                        title: opportunity.primaryNextTask.title,
                        dueDate: opportunity.primaryNextTask.dueDate,
                        status: opportunity.primaryNextTask.status,
                        assigneeName: `${opportunity.primaryNextTask.assignedUser.firstName} ${opportunity.primaryNextTask.assignedUser.lastName}`,
                      }
                    : null
                }
                newTaskHref={`/tasks/new?opportunityId=${opportunity.id}`}
              />

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

              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-2 text-sm font-semibold">Stakeholders ({opportunity.stakeholders.length})</h3>
                  {opportunity.stakeholders.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-subtle)]">No stakeholders recorded.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {opportunity.stakeholders.map((s) => (
                        <li key={s.id} className="flex items-center justify-between text-sm">
                          <Link href={`/people/${s.personId}`} className="text-[var(--color-accent)] hover:underline">
                            {s.person.firstName} {s.person.lastName}
                          </Link>
                          <span className="text-xs text-[var(--color-ink-subtle)]">{label(s.role)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
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
                  {opportunity.stage === "ON_HOLD" ? (
                    <>
                      <h3 className="mb-2 mt-4 text-sm font-semibold">On hold</h3>
                      {opportunity.onHoldReason ? <p className="text-sm text-[var(--color-ink-muted)]">{opportunity.onHoldReason}</p> : null}
                      {opportunity.holdReviewDate ? (
                        <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">Review on {format(opportunity.holdReviewDate, "d MMM yyyy")}</p>
                      ) : null}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
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
