import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { restoreRecordAction } from "@/lib/delete-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { MoreDetails } from "@/components/ui/more-details";
import { StageProgressBar } from "@/components/ui/stage-progress-bar";
import { InteractiveStageBar } from "@/components/ui/interactive-stage-bar";
import { PersonHoverCard, OrganizationHoverCard, UserHoverCard } from "@/components/shell/entity-hover-card";
import { NextActionCard } from "@/components/ui/next-action-card";
import { HistoryWithFilters } from "@/components/ui/history-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getOpportunityTimeline } from "@/lib/timeline";
import { OPPORTUNITY_STAGE_BAR_STEPS, OPPORTUNITY_STAGE_BAR_LABELS, opportunityStageBarStep, daysPerStage } from "@/lib/rules";
import { format } from "date-fns";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { Composer } from "../../activities/composer";
import { OpportunityHeaderActions } from "../opportunity-header-actions";
import { changeOpportunityStageAction } from "../actions";

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

  const [timeline, documents, auditLogs, stageHistory, mailboxConnection] = await Promise.all([
    getOpportunityTimeline(opportunity.id, user.id),
    prisma.documentOpportunity.findMany({ where: { opportunityId: opportunity.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Opportunity", entityId: opportunity.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
    prisma.opportunityStageHistory.findMany({ where: { opportunityId: opportunity.id }, orderBy: { changedAt: "asc" } }),
    prisma.mailboxConnection.findFirst({ where: { userId: user.id, emailSyncEnabled: true, status: "ACTIVE" } }),
  ]);

  const barStep = opportunityStageBarStep(opportunity.stage, stageHistory);
  const days = daysPerStage(stageHistory.map((h) => ({ stage: h.toStage, at: h.changedAt })));

  // Section 4 composer "With" picker — the record's contacts.
  const composerPeople = [
    ...(opportunity.leadContactPerson ? [{ id: opportunity.leadContactPerson.id, name: `${opportunity.leadContactPerson.firstName} ${opportunity.leadContactPerson.lastName}` }] : []),
    ...opportunity.stakeholders
      .filter((s) => s.personId !== opportunity.leadContactPerson?.id)
      .map((s) => ({ id: s.personId, name: `${s.person.firstName} ${s.person.lastName}` })),
  ];

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
            <OrganizationHoverCard organizationId={opportunity.hiringOrganizationId} name={opportunity.hiringOrganization.name} typeLabel={label(opportunity.hiringOrganization.type)}>
              <Link href={`/organisations/${opportunity.hiringOrganizationId}`} className="text-[var(--color-accent)]">
                {opportunity.hiringOrganization.name}
              </Link>
            </OrganizationHoverCard>
            {opportunity.wonMandate ? (
              <Link href={`/mandates/${opportunity.wonMandate.id}`} className="text-[var(--color-accent)]">
                Now a live search: {label(opportunity.wonMandate.status)} →
              </Link>
            ) : (
              <span>Estimated value: {formatMoney(opportunity.estimatedFeeAmount, opportunity.estimatedFeeCurrency)}</span>
            )}
          </div>
        }
        actions={
          <>
            {opportunity.wonMandateId ? (
              <Button variant="secondary" asChild>
                <Link href={`/mandates/${opportunity.wonMandateId}`}>View live search →</Link>
              </Button>
            ) : (
              <OpportunityHeaderActions
                opportunityId={opportunity.id}
                currentStage={opportunity.stage}
                context={`${opportunity.potentialRoleTitle ?? opportunity.name} · ${opportunity.hiringOrganization.name}${opportunity.estimatedFeeAmount ? ` · ${formatMoney(opportunity.estimatedFeeAmount, opportunity.estimatedFeeCurrency)}` : ""}`}
                recordName={opportunity.name}
                editHref={`/opportunities/${opportunity.id}/edit`}
                listHref="/opportunities"
                isAdmin={user.role === "ADMIN"}
              />
            )}
            {user.role === "ADMIN" && opportunity.archivedAt ? (
              <form action={() => restoreRecordAction("OPPORTUNITY", opportunity.id)}>
                <Button type="submit" variant="secondary">
                  <ArchiveRestore className="h-4 w-4" /> Restore
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      {!["LOST"].includes(opportunity.stage) ? (
        <div className="mb-4 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 pb-[18px] pt-5">
          {opportunity.wonMandateId ? (
            <StageProgressBar
              steps={OPPORTUNITY_STAGE_BAR_STEPS.map((s) => ({ key: s, label: OPPORTUNITY_STAGE_BAR_LABELS[s] }))}
              currentIndex={barStep - 1}
              days={days}
            />
          ) : (
            <InteractiveStageBar
              steps={OPPORTUNITY_STAGE_BAR_STEPS.map((s) => ({ key: s, label: OPPORTUNITY_STAGE_BAR_LABELS[s] }))}
              currentIndex={barStep - 1}
              days={days}
              recordLabel="opportunity"
              onChangeStage={async (toStage) => {
                "use server";
                await changeOpportunityStageAction({ opportunityId: opportunity.id, toStage });
              }}
            />
          )}
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Left sidebar — key facts only (section 3); everything else under More details. */}
            <Card>
              <CardContent className="flex flex-col gap-3 pt-4">
                <h3 className="text-sm font-semibold">Key facts</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-ink-subtle)]">Company</dt>
                    <dd className="truncate text-right">
                      <OrganizationHoverCard organizationId={opportunity.hiringOrganizationId} name={opportunity.hiringOrganization.name} typeLabel={label(opportunity.hiringOrganization.type)}>
                        <Link href={`/organisations/${opportunity.hiringOrganizationId}`} className="text-[var(--color-accent)]">
                          {opportunity.hiringOrganization.name}
                        </Link>
                      </OrganizationHoverCard>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-ink-subtle)]">Contact</dt>
                    <dd className="truncate text-right">
                      {opportunity.leadContactPerson ? (
                        <PersonHoverCard personId={opportunity.leadContactPerson.id} firstName={opportunity.leadContactPerson.firstName} lastName={opportunity.leadContactPerson.lastName}>
                          <Link href={`/people/${opportunity.leadContactPerson.id}`} className="text-[var(--color-accent)]">
                            {opportunity.leadContactPerson.firstName} {opportunity.leadContactPerson.lastName}
                          </Link>
                        </PersonHoverCard>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-ink-subtle)]">Fee</dt>
                    <dd>{formatMoney(opportunity.estimatedFeeAmount, opportunity.estimatedFeeCurrency)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-ink-subtle)]">Owner</dt>
                    <dd className="truncate text-right">
                      <UserHoverCard firstName={opportunity.owner.firstName} lastName={opportunity.owner.lastName}>
                        <span>{opportunity.owner.firstName} {opportunity.owner.lastName}</span>
                      </UserHoverCard>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-ink-subtle)]">Expected close</dt>
                    <dd>{opportunity.expectedDecisionDate ? format(opportunity.expectedDecisionDate, "d MMM yyyy") : "—"}</dd>
                  </div>
                </dl>

                <MoreDetails>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Type</dt><dd>{label(opportunity.type)}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Role</dt><dd>{opportunity.potentialRoleTitle || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Source</dt><dd>{label(opportunity.source)}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Related funds</dt><dd className="truncate text-right">{opportunity.relatedFunds.map((f) => f.organization.name).join(", ") || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--color-ink-subtle)]">Created by</dt><dd>{opportunity.createdBy.firstName} {opportunity.createdBy.lastName}</dd></div>
                  </dl>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Stakeholders ({opportunity.stakeholders.length})</h4>
                    {opportunity.stakeholders.length === 0 ? (
                      <p className="text-sm text-[var(--color-ink-subtle)]">None recorded.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {opportunity.stakeholders.map((s) => (
                          <li key={s.id} className="flex items-center justify-between text-sm">
                            <PersonHoverCard personId={s.personId} firstName={s.person.firstName} lastName={s.person.lastName}>
                              <Link href={`/people/${s.personId}`} className="text-[var(--color-accent)] hover:underline">
                                {s.person.firstName} {s.person.lastName}
                              </Link>
                            </PersonHoverCard>
                            <span className="text-xs text-[var(--color-ink-subtle)]">{label(s.role)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Next step</h4>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{opportunity.nextStepSummary || "—"}</p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Notes</h4>
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{opportunity.notes || "—"}</p>
                  </div>
                  {opportunity.stage === "LOST" ? (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Loss reason</h4>
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        {label(opportunity.lossReason)} {opportunity.lossExplanation ? `— ${opportunity.lossExplanation}` : ""}
                      </p>
                    </div>
                  ) : null}
                  {opportunity.stage === "ON_HOLD" ? (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">On hold</h4>
                      {opportunity.onHoldReason ? <p className="text-sm text-[var(--color-ink-muted)]">{opportunity.onHoldReason}</p> : null}
                      {opportunity.holdReviewDate ? (
                        <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">Review on {format(opportunity.holdReviewDate, "d MMM yyyy")}</p>
                      ) : null}
                    </div>
                  ) : null}
                </MoreDetails>
              </CardContent>
            </Card>

            {/* Main column — composer, then Focus, then History (section 4). */}
            <div className="flex flex-col gap-4">
              <Composer
                linkContext={{ opportunityId: opportunity.id, organizationId: opportunity.hiringOrganizationId }}
                currentUserId={user.id}
                people={composerPeople}
                documentLinkField="opportunityId"
                hasMailboxConnection={Boolean(mailboxConnection)}
              />

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
                  <h3 className="mb-3.5 text-sm font-semibold">History</h3>
                  <HistoryWithFilters items={timeline} emptyLabel="Nothing logged yet — use the composer above to log a call, note, email or file." />
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
