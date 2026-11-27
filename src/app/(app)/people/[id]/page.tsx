import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog, canMergeRecords, canMutate } from "@/lib/permissions";
import { findPersonDuplicates } from "@/lib/duplicates";
import { EmptyState } from "@/components/shell/states";
import { MoreMenu } from "@/components/shell/more-menu";
import { restoreRecordAction } from "@/lib/delete-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline } from "@/components/ui/timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { countryName } from "@/lib/iso";
import { formatMoney, initials } from "@/lib/utils";
import { getPersonTimeline } from "@/lib/timeline";
import { formatDate, formatMonthYear, formatDateTime } from "@/lib/datetime";
import {
  candidatePlainStatus,
  candidateNextStepFallback,
  candidateNextStepFallbackUrgent,
  fitLabel,
  LIVE_MANDATE_STATUSES,
} from "@/lib/rules";
import { nextActionStatus } from "@/lib/next-action-status";
import { EmploymentHistoryDialog } from "../employment-history-dialog";
import { CandidateProfileDialog } from "../candidate-profile-dialog";
import { MergeButton } from "../merge-button";
import { PracticeAreaPicker } from "../practice-area-picker";
import { AddToMandateDialog, type MandateOption } from "../add-to-mandate-dialog";
import { AnonymiseButton } from "../anonymise-button";
import { AskAtlasButton } from "@/components/shell/ask-atlas/ask-atlas-button";
import { RecordViewTracker } from "@/components/shell/record-view-tracker";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { LogActivityDialog } from "../../activities/log-activity-dialog";

function currentTitle(p: { headlineOverride: string | null; employmentHistories: { jobTitle: string }[] }) {
  return p.headlineOverride || p.employmentHistories[0]?.jobTitle || null;
}

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
      placements: { select: { id: true, mandate: { select: { title: true } } } },
    },
  });
  if (!person) notFound();

  const [timeline, processes, documents, auditLogs, organizations, duplicates, allPracticeAreas, users, liveMandatesRaw] = await Promise.all([
    getPersonTimeline(person.id, user.id),
    prisma.candidateProcess.findMany({
      where: { candidatePersonId: person.id },
      include: { mandate: { include: { hiringOrganization: true } }, primaryNextTask: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentPerson.findMany({ where: { personId: person.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Person", entityId: person.id }, include: { actor: true }, orderBy: { timestamp: "desc" }, take: 50 })
      : Promise.resolve([]),
    prisma.organization.findMany({ where: { workspaceId: user.workspaceId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canMergeRecords(user.role)
      ? findPersonDuplicates(user.workspaceId, { firstName: person.firstName, lastName: person.lastName, primaryEmail: person.primaryEmail, linkedinUrl: person.linkedinUrl }, person.id)
      : Promise.resolve([]),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId, active: true }, select: { id: true, firstName: true, lastName: true } }),
    prisma.mandate.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null, status: { in: [...LIVE_MANDATE_STATUSES] } },
      include: { hiringOrganization: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const isCandidate = person.personTypes.includes("CANDIDATE");
  const isPlacedCandidate = person.placements.length > 0;

  const liveProcesses = processes.filter(
    (p) => (LIVE_MANDATE_STATUSES as readonly string[]).includes(p.mandate.status) && p.stage !== "REJECTED" && p.stage !== "WITHDRAWN",
  );
  const existingStageByMandate = new Map(processes.map((p) => [p.mandateId, p.stage]));
  const mandateOptions: MandateOption[] = liveMandatesRaw.map((m) => ({
    id: m.id,
    title: m.title,
    orgName: m.hiringOrganization.name,
    existingStage: existingStageByMandate.get(m.id) ?? null,
  }));

  const searchRows = liveProcesses.map((p) => {
    const status = candidatePlainStatus(p.stage);
    const dotStatus = nextActionStatus(p.primaryNextTask?.dueDate ?? null);
    const nextStepText = p.primaryNextTask?.title ?? candidateNextStepFallback(p.stage, person.firstName);
    const nextStepUrgent = dotStatus === "overdue" || (!p.primaryNextTask && candidateNextStepFallbackUrgent(p.stage));
    return { process: p, status, nextStepText, nextStepUrgent };
  });

  const employmentPrompt = person.employmentHistories.length === 0;
  const fitChip = person.candidateProfile ? fitLabel(person.candidateProfile.rating) : null;
  const urgentRow = searchRows.find((r) => r.nextStepUrgent);
  const activityLinkContext = { personId: person.id, label: `${person.firstName} ${person.lastName}` };

  return (
    <div className="flex flex-col gap-6">
      <RecordViewTracker type="person" id={person.id} label={`${person.firstName} ${person.lastName}`} meta={currentTitle(person) ?? ""} href={`/people/${person.id}`} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-[18px]">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[15px] font-semibold text-[var(--color-navy-ink)]">
            {initials(person.firstName, person.lastName)}
          </span>
          <div>
            <div className="text-[13px] text-[var(--color-muted)]">
              <Link href="/people" className="text-[var(--color-muted)] no-underline">
                People
              </Link>{" "}
              / {isCandidate ? "Candidates" : person.personTypes[0] ? label(person.personTypes[0]) : "Contacts"}
            </div>
            <h1 className="mt-1.5 text-[26px] font-light leading-tight tracking-[-0.01em]">
              {person.firstName} {person.lastName}
              {person.doNotContact ? (
                <Badge tone="danger" className="ml-2">
                  Do Not Contact
                </Badge>
              ) : null}
              {person.archivedAt ? (
                <Badge tone="neutral" className="ml-2">
                  Archived
                </Badge>
              ) : null}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--color-ink2)]">
              <span>
                {currentTitle(person) ?? "No current title"}
                {person.city ? ` · ${person.city}` : ""}
              </span>
              <StatusBadge value={person.relationshipStatus} />
              {person.candidateProfile?.status === "OPEN_TO_MOVE" ? <Badge tone="success">Open to move</Badge> : null}
              {fitChip === "Strong" ? <Badge tone="info">Strong fit</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <AskAtlasButton recordType="person" recordName={`${person.firstName} ${person.lastName}`} />
          {person.primaryEmail ? (
            <Button variant="secondary" asChild>
              <a href={`mailto:${person.primaryEmail}`}>Email</a>
            </Button>
          ) : null}
          {person.linkedinUrl ? (
            <Button variant="secondary" asChild>
              <a href={person.linkedinUrl} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </Button>
          ) : null}
          <LogActivityDialog users={users} currentUserId={user.id} linkContext={activityLinkContext} />
          {isCandidate ? <AddToMandateDialog candidatePersonId={person.id} mandates={mandateOptions} /> : null}
          <Button variant="secondary" asChild>
            <Link href={`/people/${person.id}/edit`}>
              <Pencil className="h-[14px] w-[14px]" /> Edit
            </Link>
          </Button>
          {user.role === "ADMIN" && isPlacedCandidate ? (
            <AnonymiseButton personId={person.id} firstName={person.firstName} mandateTitle={person.placements[0]?.mandate.title ?? null} />
          ) : null}
          {user.role === "ADMIN" ? (
            <MoreMenu
              type="PERSON"
              id={person.id}
              listHref="/people"
              downloadDataFor={user.role === "ADMIN" ? { personId: person.id, personName: `${person.firstName} ${person.lastName}` } : undefined}
            />
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_540px] flex-col gap-4">
          {isCandidate ? (
            <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-2 pt-[18px]">
              <div className="flex items-baseline justify-between">
                <h2 className="m-0 text-base font-medium">Searches {person.firstName} is on</h2>
                <span className="text-[13px] text-[var(--color-muted)]">{liveProcesses.length} live</span>
              </div>
              {searchRows.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-muted)]">Not on any live searches.</p>
              ) : (
                searchRows.map((r, i) => (
                  <Link
                    key={r.process.id}
                    href={`/mandates/${r.process.mandateId}`}
                    className={`grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] items-center gap-5 py-3.5 text-[var(--color-ink)] no-underline ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2.5 border-t border-[var(--color-line)]"}`}
                  >
                    <span>
                      <span className="block text-[13.5px]">{r.process.mandate.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                        {r.process.mandate.hiringOrganization.name} · {r.process.mandate.reference}
                      </span>
                    </span>
                    <span>
                      <Badge tone={r.status.tone}>{r.status.label}</Badge>
                    </span>
                    <span className={`text-[13.5px] ${r.nextStepUrgent ? "text-[var(--color-warn)]" : "text-[var(--color-ink2)]"}`}>{r.nextStepText ?? ""}</span>
                  </Link>
                ))
              )}
            </section>
          ) : null}

          {isCandidate ? (
            <section className="grid grid-cols-1 gap-[18px_28px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-[18px] sm:grid-cols-2">
              <div>
                <div className="text-xs text-[var(--color-muted)]">Career summary</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed">{person.candidateProfile?.careerSummary || ""}</p>
              </div>
              <div>
                <div className="text-xs text-[var(--color-muted)]">Motivation</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed">{person.candidateProfile?.motivation || ""}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-[var(--color-muted)]">Current base</div>
                  <div className="mt-1 text-[20px] font-light">
                    {formatMoney(person.candidateProfile?.currentBaseAmount ?? null, person.candidateProfile?.currentBaseCurrency ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-muted)]">Expected base</div>
                  <div className="mt-1 text-[20px] font-light">
                    {formatMoney(person.candidateProfile?.expectedBaseAmount ?? null, person.candidateProfile?.expectedBaseCurrency ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-muted)]">Notice</div>
                  <div className="mt-1 text-[20px] font-light">
                    {person.candidateProfile?.noticePeriodValue ? `${person.candidateProfile.noticePeriodValue} ${label(person.candidateProfile.noticePeriodUnit ?? "")}` : ""}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-muted)]">Employment history</div>
                {employmentPrompt ? (
                  <div className="mt-2 rounded-[6px] bg-[var(--color-warn-bg)] px-3.5 py-3 text-[12.5px] text-[var(--color-warn)]">
                    No roles added. Search matching needs at least the current role.
                  </div>
                ) : (
                  <p className="mt-1.5 text-[13.5px] text-[var(--color-ink2)]">
                    {person.employmentHistories[0]?.jobTitle} · {person.employmentHistories[0]?.organization?.name ?? person.employmentHistories[0]?.employerNameFallback ?? ""}
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-4">
            <div className="min-w-[220px] flex-1">
              <h2 className="m-0 text-base font-medium">Activity</h2>
              <div className="mt-0.5 text-[13px] text-[var(--color-muted)]">
                {timeline.length > 0 ? `${timeline.length} logged` : urgentRow ? `Nothing logged yet. ${urgentRow.nextStepText} is due.` : "Nothing logged yet."}
              </div>
            </div>
            <LogActivityDialog users={users} currentUserId={user.id} linkContext={activityLinkContext} trigger="Log call" defaultType="CALL" />
            <LogActivityDialog users={users} currentUserId={user.id} linkContext={activityLinkContext} trigger="Log email" defaultType="EMAIL" />
            <LogActivityDialog users={users} currentUserId={user.id} linkContext={activityLinkContext} trigger="Note" defaultType="NOTE" />
          </section>

          <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-[18px]">
            <h2 className="m-0 mb-3.5 text-base font-medium">Activity log</h2>
            <Timeline items={timeline} emptyLabel="Nothing logged yet, use “Log activity” above to record a call, email, or note." />
          </section>

          {duplicates.length > 0 ? (
            <section className="rounded-[6px] border border-[var(--color-warn)] bg-[var(--color-warn-bg)] px-[22px] py-4">
              <p className="mb-2 text-sm font-medium text-[var(--color-warn)]">Possible duplicate records</p>
              <ul className="flex flex-col gap-2">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <Link href={`/people/${d.id}`} className="text-[var(--color-accent)]">
                      {d.firstName} {d.lastName} · {d.reason}
                    </Link>
                    <MergeButton survivorId={person.id} duplicateId={d.id} duplicateName={`${d.firstName} ${d.lastName}`} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Card>
            <CardContent className="p-4 pb-1.5">
              <h3 className="m-0 mb-2 text-sm font-medium">Contact</h3>
              <div className="flex justify-between gap-3 border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="shrink-0 text-[var(--color-muted)]">Email</span>
                {person.primaryEmail ? (
                  <a href={`mailto:${person.primaryEmail}`} className="min-w-0 text-right text-[var(--color-ink)]" style={{ overflowWrap: "anywhere" }}>
                    {person.primaryEmail}
                  </a>
                ) : (
                  <span className="text-[var(--color-muted)]"></span>
                )}
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Phone</span>
                <span>{person.primaryPhone || ""}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Location</span>
                <span>{[person.city, person.countryCode ? countryName(person.countryCode) : null].filter(Boolean).join(", ") || ""}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Owner</span>
                <span>{person.relationshipOwner ? `${person.relationshipOwner.firstName} ${person.relationshipOwner.lastName}` : ""}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Source</span>
                <span>{person.source ? label(person.source) : ""}</span>
              </div>
              {person.linkedinUrl ? (
                <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                  <span className="text-[var(--color-muted)]">LinkedIn</span>
                  <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-ink2)]">
                    Profile <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="m-0 text-sm font-medium">Practice areas</h3>
              <div className="mt-2.5">
                <PracticeAreaPicker
                  personId={person.id}
                  allPracticeAreas={allPracticeAreas}
                  selectedIds={person.practiceAreas.map((pa) => pa.practiceAreaId)}
                  readOnly={!canMutate(user.role)}
                />
                {person.practiceAreas.length === 0 && !canMutate(user.role) ? <span className="text-[13px] text-[var(--color-muted)]"></span> : null}
              </div>
            </CardContent>
          </Card>

          {isCandidate && person.candidateProfile ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="m-0 text-sm font-medium">Consent</h3>
                  <Badge tone={person.candidateProfile.consentStatus === "GRANTED" ? "success" : "neutral"}>{label(person.candidateProfile.consentStatus)}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
                  Legal basis: {label(person.candidateProfile.legalBasis).toLowerCase()}. Re-confirm by email before 24 months of inactivity.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-4">
              <h3 className="m-0 text-sm font-medium">Organisations</h3>
              {person.organizationAssociations.length === 0 ? (
                <>
                  <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">Not linked to any organisation.</p>
                  <Link href={`/people/${person.id}/edit`} className="mt-2 inline-block text-[13px] text-[var(--color-ink2)] no-underline">
                    + Link current employer
                  </Link>
                </>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {person.organizationAssociations.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <Link href={`/organisations/${a.organizationId}`} className="min-w-0 truncate text-[var(--color-accent)]">
                        {a.organization.name}
                      </Link>
                      <span className="shrink-0 text-xs text-[var(--color-muted)]">{a.isCurrent ? "Current" : "Past"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {user.role === "ADMIN" && person.archivedAt ? (
            <div className="flex flex-col gap-2">
              <form action={() => restoreRecordAction("PERSON", person.id)}>
                <Button type="submit" variant="secondary" className="w-full">
                  <ArchiveRestore className="h-[14px] w-[14px]" /> Restore
                </Button>
              </form>
            </div>
          ) : null}
        </aside>
      </div>

      <Tabs defaultValue={isCandidate ? "candidate" : "employment"}>
        <TabsList>
          {isCandidate ? <TabsTrigger value="candidate">Candidate profile</TabsTrigger> : null}
          <TabsTrigger value="employment">Employment history</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

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
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Status</dt>
                        <dd>
                          <StatusBadge value={person.candidateProfile.status} />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Rating</dt>
                        <dd>{label(person.candidateProfile.rating)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Last qualified</dt>
                        <dd>{person.candidateProfile.lastQualifiedAt ? formatDate(person.candidateProfile.lastQualifiedAt) : ""}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-semibold">Compensation</h3>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Current base</dt>
                        <dd>{formatMoney(person.candidateProfile.currentBaseAmount, person.candidateProfile.currentBaseCurrency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Expected base</dt>
                        <dd>{formatMoney(person.candidateProfile.expectedBaseAmount, person.candidateProfile.expectedBaseCurrency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[var(--color-muted)]">Notice period</dt>
                        <dd>{person.candidateProfile.noticePeriodValue ? `${person.candidateProfile.noticePeriodValue} ${person.candidateProfile.noticePeriodUnit ?? ""}` : ""}</dd>
                      </div>
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
                        <p className="text-sm text-[var(--color-muted)]">{e.organization?.name ?? e.employerNameFallback ?? "Unknown employer"}</p>
                      </div>
                      {e.isCurrent ? <Badge tone="success">Current</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {e.startDate ? formatMonthYear(e.startDate) : "?"} to {e.isCurrent ? "Present" : e.endDate ? formatMonthYear(e.endDate) : "?"}
                      {e.seniority ? ` · ${label(e.seniority)}` : ""}
                      {e.workArrangement ? ` · ${label(e.workArrangement)}` : ""}
                    </p>
                    {e.responsibilities ? <p className="mt-2 text-sm text-[var(--color-ink2)]">{e.responsibilities}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
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
                      <TableCell>{formatDateTime(a.timestamp)}</TableCell>
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
