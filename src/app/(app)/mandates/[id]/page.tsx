import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewMandate, canViewAuditLog } from "@/lib/permissions";
import { PermissionDeniedState, EmptyState } from "@/components/shell/states";
import { RecordViewTracker } from "@/components/shell/record-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InteractiveStageBar } from "@/components/ui/interactive-stage-bar";
import { NextUpCard } from "@/components/ui/next-up-card";
import { HistoryWithFilters } from "@/components/ui/history-filters";
import { OrganizationHoverCard, UserHoverCard } from "@/components/shell/entity-hover-card";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getMandateTimeline } from "@/lib/timeline";
import { formatDate, formatShortDate, formatAuditWhen } from "@/lib/datetime";
import { describeAuditLog } from "@/lib/audit";
import { InterviewsTab } from "../interviews-tab";
import { OfferTab } from "../offer-tab";
import { DocumentsTab } from "../../documents/documents-tab";
import type { CandidateOption } from "../add-candidate-dialog";
import { CandidatesTable, type CandidateRow } from "../candidates-table";
import { MandateHeaderActions } from "../mandate-header-actions";
import { changeMandateStatusAction } from "../actions";
import { MandateBanner } from "../mandate-banner";
import { Composer } from "../../activities/composer";
import {
  mandateConsistencyCheck,
  mandateFlowTab,
  candidateStep,
  candidatePlainStatus,
  fitLabel,
  candidateNextStepFallback,
  isCandidateHidden,
  MANDATE_STAGE_BAR_STEPS,
  MANDATE_STAGE_BAR_LABELS,
  mandateStageBarStep,
  daysPerStage,
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
      portfolioCompany: true,
      owner: true,
      hiringManagerPerson: true,
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
          offers: { orderBy: { createdAt: "desc" } },
          placement: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      primaryNextTask: { include: { assignedUser: true } },
    },
  });
  if (!mandate) notFound();

  const [timeline, interviews, documents, auditLogs, allCandidatesRaw, statusHistory, mailboxConnection, openTasks] = await Promise.all([
    getMandateTimeline(mandate.id, user.id),
    prisma.interview.findMany({
      where: { candidateProcess: { mandateId: mandate.id } },
      include: {
        candidateProcess: { include: { candidatePerson: true } },
        internalParticipants: { include: { user: true } },
        externalParticipants: { include: { person: true } },
      },
      orderBy: { scheduledStart: "desc" },
    }),
    prisma.documentMandate.findMany({ where: { mandateId: mandate.id }, include: { document: { include: { uploadedBy: true } } } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Mandate", entityId: mandate.id }, include: { actor: true }, orderBy: { timestamp: "desc" } })
      : Promise.resolve([]),
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, personTypes: { has: "CANDIDATE" } },
      select: { id: true, firstName: true, lastName: true, headlineOverride: true, employmentHistories: { where: { isCurrent: true }, take: 1 } },
      orderBy: { lastName: "asc" },
    }),
    prisma.mandateStatusHistory.findMany({ where: { mandateId: mandate.id }, orderBy: { changedAt: "asc" } }),
    prisma.mailboxConnection.findFirst({ where: { userId: user.id, emailSyncEnabled: true, status: "ACTIVE" } }),
    prisma.task.findMany({
      where: { mandates: { some: { mandateId: mandate.id } }, status: { in: ["TODO", "IN_PROGRESS"] }, archivedAt: null },
      include: { assignedUser: true },
      orderBy: { dueDate: "asc" },
    }),
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
      nextStepDueDate: p.primaryNextTask?.dueDate ?? null,
      // Round 3 item 10: only an actual overdue date turns red now, not the stage-based fallback heuristic.
      nextStepUrgent: dotStatus === "overdue",
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
    metaParts.push(`${formatMoney(mandate.minBaseAmount, mandate.baseCurrency)} to ${formatMoney(mandate.maxBaseAmount, mandate.baseCurrency)} base`);
  }
  const employmentParts = [label(mandate.employmentType), mandate.workArrangement ? label(mandate.workArrangement) : null, mandate.city].filter(Boolean);
  if (employmentParts.length) metaParts.push(employmentParts.join(" · "));

  const wonFromFund = mandate.sourceOpportunity?.relatedFunds[0]?.organization.name;
  const stageBarStep = mandateStageBarStep(mandate.status);
  const stageDays = daysPerStage(statusHistory.map((h) => ({ stage: h.toStatus, at: h.changedAt })));

  // Section 4 composer "With" picker — the record's contacts, and on mandates its candidates.
  const composerPeople = [
    ...mandate.stakeholders.map((s) => ({ id: s.personId, name: `${s.person.firstName} ${s.person.lastName}` })),
    ...mandate.candidateProcesses.map((p) => ({ id: p.candidatePersonId, name: `${p.candidatePerson.firstName} ${p.candidatePerson.lastName}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <RecordViewTracker type="mandate" id={mandate.id} label={mandate.title} meta={mandate.hiringOrganization.name} href={`/mandates/${mandate.id}`} />
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
              <OrganizationHoverCard organizationId={mandate.hiringOrganizationId} name={mandate.hiringOrganization.name} typeLabel={label(mandate.hiringOrganization.type)}>
                <Link href={`/organisations/${mandate.hiringOrganizationId}`} className="text-[var(--color-ink)] no-underline">
                  {mandate.hiringOrganization.name}
                </Link>
              </OrganizationHoverCard>
              {mandate.portfolioCompany ? (
                <span className="flex items-center gap-3.5">
                  <span className="h-3.5 w-px bg-[var(--color-line)]" />
                  <OrganizationHoverCard organizationId={mandate.portfolioCompany.id} name={mandate.portfolioCompany.name} typeLabel={label(mandate.portfolioCompany.type)}>
                    <Link href={`/organisations/${mandate.portfolioCompany.id}`} className="text-[var(--color-ink)] no-underline">
                      {mandate.portfolioCompany.name}
                    </Link>
                  </OrganizationHoverCard>
                </span>
              ) : null}
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
          </div>
          <div className="flex flex-wrap gap-2.5">
            <MandateHeaderActions
              mandateId={mandate.id}
              mandateTitle={mandate.title}
              orgName={mandate.hiringOrganization.name}
              currentStatus={mandate.status}
              candidates={candidateOptions}
              recordName={mandate.title}
              editHref={`/mandates/${mandate.id}/edit`}
              listHref="/mandates"
              isAdmin={user.role === "ADMIN"}
            />
          </div>
        </div>

        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 pb-[18px] pt-5">
          <InteractiveStageBar
            steps={MANDATE_STAGE_BAR_STEPS.map((s) => ({ key: s, label: MANDATE_STAGE_BAR_LABELS[s] }))}
            currentIndex={stageBarStep - 1}
            days={stageDays}
            recordName={`${mandate.title} · ${mandate.hiringOrganization.name}`}
            onChangeStage={async (toStatus, note) => {
              "use server";
              await changeMandateStatusAction({ mandateId: mandate.id, toStatus, notes: note });
            }}
          />
        </div>
      </header>

      {banner ? <MandateBanner mandateId={mandate.id} banner={banner} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left sidebar — key facts only (section 3). */}
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            <h3 className="text-sm font-semibold">Key facts</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Client</dt>
                <dd className="truncate text-right">
                  <OrganizationHoverCard organizationId={mandate.hiringOrganizationId} name={mandate.hiringOrganization.name} typeLabel={label(mandate.hiringOrganization.type)}>
                    <Link href={`/organisations/${mandate.hiringOrganizationId}`} className="text-[var(--color-accent)]">
                      {mandate.hiringOrganization.name}
                    </Link>
                  </OrganizationHoverCard>
                </dd>
              </div>
              {mandate.portfolioCompany ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-ink-subtle)]">Portfolio company</dt>
                  <dd className="truncate text-right">
                    <OrganizationHoverCard organizationId={mandate.portfolioCompany.id} name={mandate.portfolioCompany.name} typeLabel={label(mandate.portfolioCompany.type)}>
                      <Link href={`/organisations/${mandate.portfolioCompany.id}`} className="text-[var(--color-accent)]">
                        {mandate.portfolioCompany.name}
                      </Link>
                    </OrganizationHoverCard>
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Fee</dt>
                <dd>
                  {mandate.feePercentage
                    ? `${mandate.feePercentage}%`
                    : mandate.fixedFeeAmount
                      ? formatMoney(mandate.fixedFeeAmount, mandate.baseCurrency)
                      : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Lead consultant</dt>
                <dd className="truncate text-right">
                  <UserHoverCard firstName={mandate.owner.firstName} lastName={mandate.owner.lastName}>
                    <span>{mandate.owner.firstName} {mandate.owner.lastName}</span>
                  </UserHoverCard>
                </dd>
              </div>
              {mandate.hiringManagerPerson ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-ink-subtle)]">Hiring manager</dt>
                  <dd className="truncate text-right">{mandate.hiringManagerPerson.firstName} {mandate.hiringManagerPerson.lastName}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Start date</dt>
                <dd>{mandate.startDate ? formatDate(mandate.startDate) : ""}</dd>
              </div>
              {mandate.sourceOpportunity ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-[var(--color-ink-subtle)]">Won from</dt>
                  <dd>
                    <Link href={`/opportunities/${mandate.sourceOpportunity.id}`} className="block w-full truncate text-[var(--color-accent)]">
                      {mandate.sourceOpportunity.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
            {mandate.sourceOpportunity ? (
              <p className="text-xs text-[var(--color-muted)]">
                {mandate.sourceOpportunity.closedAt ? `Won ${formatDate(mandate.sourceOpportunity.closedAt)}` : "Won"}
                {mandate.fixedFeeAmount
                  ? ` · ${formatMoney(mandate.fixedFeeAmount, mandate.fixedFeeCurrency)} fee`
                  : mandate.sourceOpportunity.estimatedFeeAmount
                    ? ` · ${formatMoney(mandate.sourceOpportunity.estimatedFeeAmount, mandate.sourceOpportunity.estimatedFeeCurrency)} estimated fee`
                    : ""}
                {wonFromFund ? ` · introduced by ${wonFromFund}` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Main column — tabs, Activity (composer/Focus/History) first, Candidates next to it (section 3). */}
        <Tabs defaultValue={flowTab}>
        <TabsList>
          <TabsTrigger value="activity-view">Timeline</TabsTrigger>
          <span className="mb-3 h-[18px] w-px self-start bg-[var(--color-line)]" />
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
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="activity-view">
          <div className="flex flex-col gap-4">
            <Composer
              linkContext={{ mandateId: mandate.id, organizationId: mandate.hiringOrganizationId }}
              currentUserId={user.id}
              people={composerPeople}
              documentLinkField="mandateId"
              hasMailboxConnection={Boolean(mailboxConnection)}
            />

            <NextUpCard
              tasks={openTasks.map((t) => ({
                id: t.id,
                title: t.title,
                dueDate: t.dueDate,
                status: t.status,
                assigneeName: `${t.assignedUser.firstName} ${t.assignedUser.lastName}`,
              }))}
              newTaskHref={`/tasks/new?mandateId=${mandate.id}`}
            />

            <Card>
              <CardContent className="pt-4">
                <h3 className="mb-3.5 text-sm font-semibold">History</h3>
                <HistoryWithFilters items={timeline} emptyLabel="Nothing logged yet, use the composer above to log a call, note, email or file." />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                        <div className="mt-1 text-[13px] text-[var(--color-warn)]">Overdue since {formatShortDate(mandate.primaryNextTask.dueDate)}</div>
                      ) : (
                        <div className="mt-1 text-[13px] text-[var(--color-muted)]">Due {formatShortDate(mandate.primaryNextTask.dueDate)}</div>
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
                  <div className="text-[13px] text-[var(--color-muted)]">{latestNoteDate ? `Latest note · ${formatShortDate(latestNoteDate)}` : "Latest note"}</div>
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
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">The role</h3>
                  <Link href={`/mandates/${mandate.id}/edit`} className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
                    Edit
                  </Link>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Role summary</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.roleSummary || ""}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Business context</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.businessContext || ""}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Must-haves</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.requiredExperience || ""}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Nice to have</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.preferredExperience || ""}</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">How we will assess</h3>
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-ink2)]">{mandate.assessmentCriteria || ""}</p>
                </div>
              </CardContent>
            </Card>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
              <Card>
                <CardContent className="flex flex-col gap-2 p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-[15px] font-medium">Terms</h3>
                    <Link href={`/mandates/${mandate.id}/edit`} className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
                      Edit
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 border-t border-[var(--color-line)] py-2">
                    {mandate.signedTerms ? <DoneTick /> : null}
                    <span>{mandate.signedTerms && mandate.termsSignedDate ? `Terms signed · ${formatDate(mandate.termsSignedDate)}` : "Terms not yet signed"}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Engagement model</dt>
                    <dd>{label(mandate.engagementModel)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Fee basis</dt>
                    <dd>
                      {mandate.feePercentage
                        ? `${label(mandate.feeType)} · ${mandate.feePercentage}%`
                        : mandate.fixedFeeAmount
                          ? formatMoney(mandate.fixedFeeAmount, mandate.baseCurrency)
                          : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Payment terms</dt>
                    <dd>{mandate.paymentTermsDays ? `${mandate.paymentTermsDays} days` : ""}</dd>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4 text-sm">
                  <h3 className="mb-1 text-[15px] font-medium">Details</h3>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Seniority</dt>
                    <dd>{mandate.seniority ? label(mandate.seniority) : ""}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Number of hires</dt>
                    <dd>{mandate.numberOfHires}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Target completion</dt>
                    <dd>{mandate.targetCompletionDate ? formatDate(mandate.targetCompletionDate) : ""}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Related funds</dt>
                    <dd className="text-right">{mandate.relatedFunds.map((f) => f.organization.name).join(", ") || ""}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Confidential</dt>
                    <dd>{mandate.confidentiality === "OPEN" ? "No" : label(mandate.confidentiality)}</dd>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interviews">
          <InterviewsTab interviews={interviews} />
        </TabsContent>

        <TabsContent value="offer">
          <OfferTab candidates={mandate.candidateProcesses.filter((p) => p.offers.length > 0 || p.placement)} />
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
                <dd>{mandate.feePercentage ? `${mandate.feePercentage}%` : mandate.fixedFeeAmount ? formatMoney(mandate.fixedFeeAmount, mandate.baseCurrency) : ""}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Payment terms</dt>
                <dd>{mandate.paymentTermsDays ? `${mandate.paymentTermsDays} days` : ""}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Exclusivity</dt>
                <dd>{mandate.exclusivity ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Guarantee</dt>
                <dd>{mandate.guaranteeValue ? `${mandate.guaranteeValue} ${mandate.guaranteeUnit}` : ""}</dd>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab linkField="mandateId" linkId={mandate.id} documents={documents.map((d) => ({ junctionId: d.id, ...d.document }))} />
        </TabsContent>

        {canViewAuditLog(user.role) ? (
          <TabsContent value="audit">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-base font-semibold">Changes to this mandate</h3>
                <p className="mb-3.5 mt-0.5 text-sm text-[var(--color-ink-subtle)]">Every edit, stage move, file and payment, newest first.</p>
                {auditLogs.length === 0 ? (
                  <EmptyState title="No audit history" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>What changed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap text-[var(--color-ink-subtle)]">{formatAuditWhen(a.timestamp)}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System"}</TableCell>
                          <TableCell>{describeAuditLog(a)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
        </Tabs>
      </div>
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
