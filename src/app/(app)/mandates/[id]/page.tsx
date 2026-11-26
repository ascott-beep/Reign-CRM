import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, Phone, Mail, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewMandate, canViewAuditLog } from "@/lib/permissions";
import { PermissionDeniedState, EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getMandateTimeline } from "@/lib/timeline";
import { format } from "date-fns";
import { archiveMandateAction } from "../actions";
import { AddCandidateDialog, type CandidateOption } from "../add-candidate-dialog";
import { CandidatesTable, type CandidateRow } from "../candidates-table";
import { StageBar } from "../stage-bar";
import { MandateBanner } from "../mandate-banner";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { LogActivityDialog } from "../../activities/log-activity-dialog";
import {
  mandateConsistencyCheck,
  mandateFlowTab,
  candidateStep,
  candidatePlainStatus,
  fitLabel,
  candidateNextStepFallback,
  candidateNextStepFallbackUrgent,
  isCandidateHidden,
} from "@/lib/rules";
import { nextActionStatus } from "@/lib/next-action-status";

function currentTitle(person: { headlineOverride: string | null; employmentHistories: { jobTitle: string }[] }) {
  return person.headlineOverride?.split(",")[0] ?? person.employmentHistories[0]?.jobTitle ?? null;
}

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
      sourceOpportunity: { include: { relatedFunds: { include: { organization: true } } } },
      relatedFunds: { include: { organization: true } },
      stakeholders: { include: { person: true } },
      assignedUsers: { include: { user: true } },
      candidateProcesses: {
        include: {
          candidatePerson: {
            include: { candidateProfile: true, employmentHistories: { where: { isCurrent: true }, take: 1 } },
          },
          primaryNextTask: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      primaryNextTask: { include: { assignedUser: true } },
    },
  });
  if (!mandate) notFound();

  const [timeline, interviews, documents, auditLogs, allCandidatesRaw, users] = await Promise.all([
    getMandateTimeline(mandate.id),
    prisma.interview.findMany({
      where: { candidateProcess: { mandateId: mandate.id } },
      include: { candidateProcess: { include: { candidatePerson: true } } },
      orderBy: { scheduledStart: "desc" },
    }),
    prisma.documentMandate.findMany({ where: { mandateId: mandate.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Mandate", entityId: mandate.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, personTypes: { has: "CANDIDATE" } },
      select: { id: true, firstName: true, lastName: true, headlineOverride: true, employmentHistories: { where: { isCurrent: true }, take: 1 } },
      orderBy: { lastName: "asc" },
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  const existingStageByPerson = new Map(mandate.candidateProcesses.map((p) => [p.candidatePersonId, p.stage]));
  const candidateOptions: CandidateOption[] = allCandidatesRaw.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    title: currentTitle(c),
    existingStage: existingStageByPerson.get(c.id) ?? null,
  }));

  const candidateRows: CandidateRow[] = mandate.candidateProcesses.map((p) => {
    const step = candidateStep(p.stage);
    const status = candidatePlainStatus(p.stage);
    const dotStatus = nextActionStatus(p.primaryNextTask?.dueDate);
    const nextStepText = p.primaryNextTask?.title ?? candidateNextStepFallback(p.stage, p.candidatePerson.firstName);
    return {
      id: p.id,
      candidatePersonId: p.candidatePersonId,
      candidateFirstName: p.candidatePerson.firstName,
      candidateName: `${p.candidatePerson.firstName} ${p.candidatePerson.lastName}`,
      candidateTitle: currentTitle(p.candidatePerson),
      statusLabel: status.label,
      statusTone: status.tone,
      step: step?.step ?? 1,
      fit: p.candidatePerson.candidateProfile ? fitLabel(p.candidatePerson.candidateProfile.rating) : null,
      nextStepText,
      nextStepUrgent: dotStatus === "overdue" || (!p.primaryNextTask && candidateNextStepFallbackUrgent(p.stage)),
      hidden: isCandidateHidden(p.stage),
    };
  });
  const visibleCandidateRows = candidateRows.filter((r) => !r.hidden).sort((a, b) => b.step - a.step);
  const hiddenCandidateRows = candidateRows.filter((r) => r.hidden);

  const banner = mandateConsistencyCheck(
    mandate,
    mandate.candidateProcesses.map((p) => ({ id: p.id, stage: p.stage, candidateFirstName: p.candidatePerson.firstName, candidateLastName: p.candidatePerson.lastName })),
  );

  const clientSide = mandate.stakeholders.map((s) => ({ name: `${s.person.firstName} ${s.person.lastName}`, role: label(s.role) }));

  const reignTeam = [`${mandate.owner.firstName} ${mandate.owner.lastName} (lead)`, ...mandate.assignedUsers.map((a) => `${a.user.firstName} ${a.user.lastName}`)];

  const latestNote = timeline.find((t) => t.kind === "activity" && t.summary);
  const latestNoteDate = latestNote && latestNote.kind === "activity" ? latestNote.date : null;

  const flowTab = mandateFlowTab(mandate.status);
  const briefDone = mandate.signedTerms;
  const candidatesDone = ["INTERVIEWING", "OFFER", "FILLED"].includes(mandate.status);
  const interviewsDone = ["OFFER", "FILLED"].includes(mandate.status);
  const offerDone = mandate.status === "FILLED";

  const metaParts: string[] = [];
  if (mandate.minBaseAmount || mandate.maxBaseAmount) {
    metaParts.push(`${formatMoney(mandate.minBaseAmount, mandate.baseCurrency)}–${formatMoney(mandate.maxBaseAmount, mandate.baseCurrency)} base`);
  }
  const employmentParts = [label(mandate.employmentType), mandate.workArrangement ? label(mandate.workArrangement) : null, mandate.city].filter(Boolean);
  if (employmentParts.length) metaParts.push(employmentParts.join(" · "));

  const wonFromFund = mandate.sourceOpportunity?.relatedFunds[0]?.organization.name;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[13px] text-[var(--color-muted)]">
              <Link href="/mandates" className="text-[var(--color-muted)] no-underline">
                Mandates
              </Link>{" "}
              / {mandate.reference}
            </div>
            <h1 className="mt-2.5 text-[28px] font-light leading-tight tracking-[-0.01em]">{mandate.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[14.5px] text-[var(--color-ink2)]">
              <Link href={`/organisations/${mandate.hiringOrganizationId}`} className="text-[var(--color-ink)] no-underline">
                {mandate.hiringOrganization.name}
              </Link>
              {metaParts.map((p) => (
                <span key={p} className="flex items-center gap-3.5">
                  <span className="h-3.5 w-px bg-[var(--color-line)]" />
                  <span>{p}</span>
                </span>
              ))}
              {mandate.priority !== "NORMAL" ? (
                <Badge tone={mandate.priority === "CRITICAL" || mandate.priority === "HIGH" ? "warning" : "neutral"}>{label(mandate.priority)}</Badge>
              ) : null}
            </div>
            {mandate.sourceOpportunity ? (
              <div className="mt-2.5 text-[13.5px] text-[var(--color-muted)]">
                Won from{" "}
                <Link href={`/opportunities/${mandate.sourceOpportunity.id}`} className="border-b border-[var(--color-line)] text-[var(--color-ink2)] no-underline">
                  {mandate.sourceOpportunity.name}
                </Link>
                {mandate.sourceOpportunity.estimatedFeeAmount
                  ? ` · ${formatMoney(mandate.sourceOpportunity.estimatedFeeAmount, mandate.sourceOpportunity.estimatedFeeCurrency)} estimated fee`
                  : ""}
                {wonFromFund ? ` · introduced by ${wonFromFund}` : ""}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <LogActivityDialog users={users} currentUserId={user.id} linkContext={{ mandateId: mandate.id, label: `${mandate.reference} — ${mandate.title}` }} />
            <Button variant="secondary" asChild>
              <Link href={`/tasks/new?mandateId=${mandate.id}`}>Add task</Link>
            </Button>
            <AddCandidateDialog mandateId={mandate.id} mandateTitle={mandate.title} orgName={mandate.hiringOrganization.name} candidates={candidateOptions} />
            <Button variant="secondary" asChild>
              <Link href={`/mandates/${mandate.id}/edit`}>
                <Pencil className="h-[14px] w-[14px]" /> Edit
              </Link>
            </Button>
            <form action={archiveMandateAction.bind(null, mandate.id)}>
              <Button type="submit" variant="secondary">
                <Archive className="h-[14px] w-[14px]" />
              </Button>
            </form>
          </div>
        </div>

        <StageBar status={mandate.status} />
      </header>

      {banner ? <MandateBanner mandateId={mandate.id} banner={banner} /> : null}

      <Tabs defaultValue={flowTab}>
        <TabsList>
          <TabsTrigger value="brief" className="gap-1.5">
            {briefDone ? <DoneTick /> : null} Brief
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-1.5">
            {candidatesDone ? <DoneTick /> : null} Candidates
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1.5">
            {interviewsDone ? <DoneTick /> : null} Interviews
          </TabsTrigger>
          <TabsTrigger value="offer" className="gap-1.5">
            {offerDone ? <DoneTick /> : null} Offer
          </TabsTrigger>
          <span className="mb-3 h-[18px] w-px self-start bg-[var(--color-line)]" />
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="candidates">
          <div className="flex flex-wrap items-start gap-4">
            <section className="min-w-0 flex-[3_1_600px] overflow-x-auto rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 pb-1.5 pt-[22px]">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="m-0 text-base font-medium">
                  {mandate.candidateProcesses.length} candidate{mandate.candidateProcesses.length === 1 ? "" : "s"} on this search
                </h2>
                <span className="text-[13px] text-[var(--color-muted)]">Most advanced first</span>
              </div>
              <CandidatesTable
                mandateId={mandate.id}
                rows={visibleCandidateRows}
                hiddenRows={hiddenCandidateRows}
                mandateTitle={mandate.title}
                organizationName={mandate.hiringOrganization.name}
              />
            </section>

            <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-[13px] text-[var(--color-muted)]">Your next task on this search</div>
                  {mandate.primaryNextTask ? (
                    <>
                      <div className="mt-1.5 text-sm">{mandate.primaryNextTask.title}</div>
                      {nextActionStatus(mandate.primaryNextTask.dueDate) === "overdue" ? (
                        <div className="mt-1 text-[13px] text-[var(--color-warn)]">Overdue since {format(mandate.primaryNextTask.dueDate, "d MMM")}</div>
                      ) : (
                        <div className="mt-1 text-[13px] text-[var(--color-muted)]">Due {format(mandate.primaryNextTask.dueDate, "d MMM")}</div>
                      )}
                    </>
                  ) : (
                    <div className="mt-1.5 text-sm text-[var(--color-muted)]">Nothing scheduled.</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 pb-1.5">
                  <h3 className="m-0 text-[15px] font-medium">Client side</h3>
                  {clientSide.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">No client contacts recorded.</p>
                  ) : (
                    clientSide.map((c, i) => (
                      <div key={`${c.name}-${i}`} className={`py-2.5 ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2 border-t border-[var(--color-line)]"}`}>
                        <span className="block text-sm">{c.name}</span>
                        <span className="mt-0.5 block text-[13px] text-[var(--color-muted)]">{c.role}</span>
                      </div>
                    ))
                  )}
                  <div className="border-t border-[var(--color-line)] py-2.5 text-[13px] text-[var(--color-muted)]">Reign team: {reignTeam.join(", ")}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[13px] text-[var(--color-muted)]">{latestNoteDate ? `Latest note · ${format(latestNoteDate, "d MMM")}` : "Latest note"}</div>
                  <div className="mt-1.5 text-sm leading-relaxed">
                    {latestNote && latestNote.kind === "activity" ? latestNote.summary : "Nothing logged yet."}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="brief">
          <div className="flex flex-wrap items-start gap-4">
            <Card className="min-w-0 flex-[2_1_480px]">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--color-muted)]">Terms signed:</span>
                  <Badge tone={mandate.signedTerms ? "success" : "warning"}>{mandate.signedTerms ? "Yes" : "Not yet"}</Badge>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Role summary</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.roleSummary || "—"}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Business context</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.businessContext || "—"}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Must-haves</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.requiredExperience || "—"}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Assessment criteria</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.assessmentCriteria || "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-0 flex-[1_1_280px]">
              <CardContent className="flex flex-col gap-2 p-4 text-sm">
                <h3 className="mb-1 text-[15px] font-medium">Details</h3>
                <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                  <dt className="text-[var(--color-muted)]">Seniority</dt>
                  <dd>{mandate.seniority ? label(mandate.seniority) : "—"}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                  <dt className="text-[var(--color-muted)]">Number of hires</dt>
                  <dd>{mandate.numberOfHires}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                  <dt className="text-[var(--color-muted)]">Target completion</dt>
                  <dd>{mandate.targetCompletionDate ? format(mandate.targetCompletionDate, "d MMM yyyy") : "—"}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                  <dt className="text-[var(--color-muted)]">Related funds</dt>
                  <dd className="text-right">{mandate.relatedFunds.map((f) => f.organization.name).join(", ") || "—"}</dd>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <TableCell>
                      {i.candidateProcess.candidatePerson.firstName} {i.candidateProcess.candidatePerson.lastName}
                    </TableCell>
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

        <TabsContent value="offer">
          {candidateRows.filter((r) => r.step >= 5).length === 0 ? (
            <EmptyState title="No candidates at offer stage yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Where they are</TableHead>
                  <TableHead>Next step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidateRows
                  .filter((r) => r.step >= 5)
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.candidateName}</TableCell>
                      <TableCell>
                        <Badge tone={r.statusTone}>{r.statusLabel}</Badge>
                      </TableCell>
                      <TableCell>{r.nextStepText ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Engagement model</dt>
                <dd>{label(mandate.engagementModel)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Fee type</dt>
                <dd>{label(mandate.feeType)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Fee</dt>
                <dd>{mandate.feePercentage ? `${mandate.feePercentage}%` : mandate.fixedFeeAmount ? formatMoney(mandate.fixedFeeAmount, mandate.baseCurrency) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Payment terms</dt>
                <dd>{mandate.paymentTermsDays ? `${mandate.paymentTermsDays} days` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Exclusivity</dt>
                <dd>{mandate.exclusivity ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Guarantee</dt>
                <dd>{mandate.guaranteeValue ? `${mandate.guaranteeValue} ${mandate.guaranteeUnit}` : "—"}</dd>
              </div>
            </CardContent>
          </Card>
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
                      <a href={`/api/documents/${d.documentId}/download`} className="flex items-center gap-1.5 text-[var(--color-ink)]">
                        <FileText className="h-3.5 w-3.5" /> {d.document.displayName}
                      </a>
                    </TableCell>
                    <TableCell>{label(d.document.category)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {timeline.length === 0 ? (
            <EmptyState title="Nothing logged yet" />
          ) : (
            <ul className="flex flex-col gap-3">
              {timeline.map((t) => (
                <li key={`${t.kind}-${t.id}`} className="flex gap-3 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3">
                  {t.kind === "activity" ? <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" /> : <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {t.kind === "activity" ? (t.summary ?? label(t.activityType)) : t.kind === "task" ? t.title : `${label(t.fromLabel)} → ${label(t.toLabel)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{format(t.date, "d MMM yyyy")}</p>
                  </div>
                </li>
              ))}
            </ul>
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

function DoneTick() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-pos-bg)] text-[var(--color-pos)]">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
  );
}
