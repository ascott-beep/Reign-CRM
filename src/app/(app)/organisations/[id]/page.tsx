import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, ArchiveRestore } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
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
import { formatMoney, formatConvertedMoney, initials } from "@/lib/utils";
import { normalizeExchangeRates, convertedTotal } from "@/lib/currency";
import { getOrganizationTimeline } from "@/lib/timeline";
import { format } from "date-fns";
import { forwardRelationshipLabel, inverseRelationshipLabel } from "@/lib/relationship-labels";
import { LIVE_MANDATE_STATUSES, mandateStagePosition, holdStageFromAcquisitionDate } from "@/lib/rules";
import { AddRelationshipDialog } from "../add-relationship-dialog";
import { UploadDocumentDialog } from "../../documents/upload-document-dialog";
import { LogActivityDialog } from "../../activities/log-activity-dialog";

const HOLD_STAGE_LABEL: Record<string, string> = {
  NEWLY_ACQUIRED: "Newly acquired",
  EARLY_HOLD: "Early hold",
  MID_HOLD: "Mid hold",
  LATE_HOLD: "Late hold",
  EXIT_ANNOUNCED: "Exit announced",
  UNKNOWN: "Unknown",
};

function monthsSince(date: Date) {
  return Math.round((Date.now() - date.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}

function isStaleVerification(lastVerifiedAt: Date | null) {
  return !lastVerifiedAt || lastVerifiedAt < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
}

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

  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { defaultCurrency: true, exchangeRatesToGbp: true } });
  const displayCurrency = workspace.defaultCurrency;
  const ratesToGbp = normalizeExchangeRates(workspace.exchangeRatesToGbp);

  const investorFundIds = org.relationshipsAsTarget.map((r) => r.sourceOrganizationId);

  const [timeline, opportunities, mandates, intelligence, documents, auditLogs, allOrgsForRelationship, users, siblingRelationships, placementFees] = await Promise.all([
    getOrganizationTimeline(org.id),
    prisma.opportunity.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.mandate.findMany({ where: { hiringOrganizationId: org.id, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.intelligenceItem.findMany({ where: { organizationId: org.id, archivedAt: null }, orderBy: { dateReceived: "desc" } }),
    prisma.documentOrganization.findMany({ where: { organizationId: org.id }, include: { document: true } }),
    canViewAuditLog(user.role)
      ? prisma.auditLog.findMany({ where: { entityType: "Organization", entityId: org.id }, include: { actor: true }, orderBy: { timestamp: "desc" }, take: 50 })
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
    prisma.placement.findMany({ where: { hiringOrganizationId: org.id }, select: { feeAmount: true, feeCurrency: true } }),
  ]);

  // A sibling portco can show up once per shared investor fund — keep only the first (most recent) row per company.
  // Filtered to actual portfolio companies since a fund's outbound relationships can also include things like
  // co-investor funds, which don't belong under "other portfolio companies."
  const siblingPortcos = Array.from(
    new Map(siblingRelationships.filter((r) => r.targetOrganization.type === "PORTFOLIO_COMPANY").map((r) => [r.targetOrganizationId, r])).values(),
  );
  const siblingLiveMandates =
    siblingPortcos.length > 0
      ? await prisma.mandate.findMany({
          where: { hiringOrganizationId: { in: siblingPortcos.map((r) => r.targetOrganizationId) }, status: { in: [...LIVE_MANDATE_STATUSES] } },
          select: { hiringOrganizationId: true },
        })
      : [];
  const siblingHasLiveMandate = new Set(siblingLiveMandates.map((m) => m.hiringOrganizationId));

  const liveMandates = mandates.filter((m) => (LIVE_MANDATE_STATUSES as readonly string[]).includes(m.status));
  const currentInvestors = org.relationshipsAsTarget.filter((r) => !r.exitDate);
  const earliestInvestmentDate = currentInvestors.reduce<Date | null>(
    (earliest, r) => (r.investmentDate && (!earliest || r.investmentDate < earliest) ? r.investmentDate : earliest),
    null,
  );
  const holdStage = org.investmentStageOverride ?? (earliestInvestmentDate ? holdStageFromAcquisitionDate(earliestInvestmentDate) : null);
  const feesWithClient = convertedTotal(
    placementFees.filter((p) => p.feeAmount).map((p) => ({ amount: Number(p.feeAmount), currency: p.feeCurrency })),
    displayCurrency,
    ratesToGbp,
  );
  const lastActivity = timeline[0];
  const stale = org.accountPriority === "PRIORITY" && isStaleVerification(org.lastVerifiedAt);

  const factCards = [
    org.type === "PORTFOLIO_COMPANY" && earliestInvestmentDate
      ? {
          label: "Owned by investors for",
          value: `${monthsSince(earliestInvestmentDate)} months`,
          detail: holdStage ? HOLD_STAGE_LABEL[holdStage] : null,
        }
      : null,
    {
      label: "Live mandates",
      value: String(liveMandates.length),
      detail: liveMandates[0] ? `${liveMandates[0].title} · ${label(liveMandates[0].status)}` : "None open",
    },
    {
      label: "Fees with this client",
      value: formatConvertedMoney(feesWithClient.amount, feesWithClient.approx, displayCurrency),
      detail: feesWithClient.amount > 0 ? null : "No placements yet",
    },
    {
      label: "Last contact",
      value: lastActivity ? format(lastActivity.date, "d MMM") : "—",
      detail: lastActivity ? null : "Nothing logged",
    },
  ].filter(Boolean) as { label: string; value: string; detail: string | null }[];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-[18px]">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] bg-[var(--color-navy)] text-[15px] font-semibold text-[var(--color-navy-ink)]">
            {initials(org.name.split(" ")[0] ?? org.name, org.name.split(" ")[1] ?? "")}
          </span>
          <div>
            <div className="text-[13px] text-[var(--color-muted)]">
              <Link href="/organisations" className="text-[var(--color-muted)] no-underline">
                Organisations
              </Link>{" "}
              / {label(org.type)}
            </div>
            <h1 className="mt-1.5 text-[26px] font-light leading-tight tracking-[-0.01em]">
              {org.name} {org.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--color-ink2)]">
              <span>
                {label(org.type)}
                {org.sectors.length > 0 ? ` · ${org.sectors.map((s) => s.sector.name).join(", ")}` : ""}
                {org.employeeCountMin || org.employeeCountMax ? ` · ${org.employeeCountMin ?? "?"}–${org.employeeCountMax ?? "?"} employees` : ""}
              </span>
              <StatusBadge value={org.status} />
              {org.accountPriority === "PRIORITY" ? <Badge tone="info">Priority</Badge> : null}
              <Badge tone={stale ? "warning" : "neutral"}>{org.lastVerifiedAt ? `Verified ${format(org.lastVerifiedAt, "d MMM")} · re-verify` : "Never verified"}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {org.website ? (
            <Button variant="secondary" asChild>
              <a href={org.website} target="_blank" rel="noreferrer">
                Website
              </a>
            </Button>
          ) : null}
          <LogActivityDialog users={users} currentUserId={user.id} linkContext={{ organizationId: org.id, label: org.name }} />
          <Button variant="secondary" asChild>
            <Link href={`/people/new?organizationId=${org.id}`}>Add person</Link>
          </Button>
          <Button asChild>
            <Link href={`/opportunities/new?organizationId=${org.id}`}>+ Add opportunity</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/organisations/${org.id}/edit`}>
              <Pencil className="h-[14px] w-[14px]" /> Edit
            </Link>
          </Button>
          {user.role === "ADMIN" ? <MoreMenu type="ORGANIZATION" id={org.id} listHref="/organisations" /> : null}
        </div>
      </header>

      <section aria-label="Key facts" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {factCards.map((c) => (
          <div key={c.label} className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[18px] py-3.5">
            <div className="text-[12.5px] text-[var(--color-muted)]">{c.label}</div>
            <div className="mt-1.5 text-[20px] font-light tracking-[-0.02em]">{c.value}</div>
            {c.detail ? <div className="mt-1 text-xs text-[var(--color-muted)]">{c.detail}</div> : null}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_540px] flex-col gap-4">
          <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] pb-2 pt-[18px]">
            <h2 className="m-0 text-base font-medium">Work with {org.name.split(" ")[0]}</h2>
            {mandates.length === 0 && opportunities.length === 0 ? (
              <p className="py-6 text-sm text-[var(--color-muted)]">Nothing on this client yet.</p>
            ) : (
              <>
                {mandates.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/mandates/${m.id}`}
                    className={`grid grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px] items-center gap-[18px] py-3 text-[13.5px] text-[var(--color-ink)] no-underline ${i > 0 || opportunities.length > 0 ? "border-t border-[var(--color-line)]" : "border-t border-[var(--color-line)] mt-3"}`}
                  >
                    <span>
                      <Badge tone="neutral">Mandate</Badge>
                    </span>
                    <span>{m.title}</span>
                    {(LIVE_MANDATE_STATUSES as readonly string[]).includes(m.status) ? (
                      <span className="relative flex h-3.5 items-center">
                        <span className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--color-track)]" />
                        <span
                          className="absolute h-1.5 rounded-full bg-[var(--color-fill)]"
                          style={{ width: `${mandateStagePosition(m.status as (typeof LIVE_MANDATE_STATUSES)[number])}%` }}
                        />
                        <span
                          className="absolute h-3.5 w-3.5 rounded-full bg-[var(--color-dot)]"
                          style={{ left: `calc(${mandateStagePosition(m.status as (typeof LIVE_MANDATE_STATUSES)[number])}% - 7px)` }}
                        />
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">{label(m.status)}</span>
                    )}
                    <span className="text-right text-[12.5px] text-[var(--color-ink2)]">{label(m.status)}</span>
                  </Link>
                ))}
                {opportunities.map((o, i) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className={`grid grid-cols-[90px_minmax(0,1.4fr)_minmax(0,1.2fr)_110px] items-center gap-[18px] py-3 text-[13.5px] text-[var(--color-ink)] no-underline ${i > 0 || mandates.length > 0 ? "border-t border-[var(--color-line)]" : "border-t border-[var(--color-line)] mt-3"}`}
                  >
                    <span>
                      <Badge tone="neutral">Opportunity</Badge>
                    </span>
                    <span>{o.potentialRoleTitle ?? o.name}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {formatMoney(o.estimatedFeeAmount, o.estimatedFeeCurrency)} · {label(o.stage).toLowerCase()}
                    </span>
                    <span className="text-right text-[12.5px] text-[var(--color-ink2)]">{o.name}</span>
                  </Link>
                ))}
              </>
            )}
          </section>

          {org.type === "PORTFOLIO_COMPANY" ? (
            <section className="grid grid-cols-1 gap-[18px_32px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-[18px] sm:grid-cols-2">
              <div>
                <h2 className="m-0 text-base font-medium">Ownership</h2>
                {org.relationshipsAsTarget.length === 0 ? (
                  <p className="mt-2.5 text-sm text-[var(--color-muted)]">No investor relationships recorded yet.</p>
                ) : (
                  org.relationshipsAsTarget.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/organisations/${r.sourceOrganizationId}`}
                      className={`flex justify-between gap-3 py-2.5 text-[13.5px] text-[var(--color-ink)] no-underline ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2.5 border-t border-[var(--color-line)]"}`}
                    >
                      <span>{r.sourceOrganization.name}</span>
                      <span className="whitespace-nowrap text-[13px] text-[var(--color-muted)]">
                        {r.exitDate ? `exited ${format(r.exitDate, "MMM yyyy")}` : r.investmentDate ? `since ${format(r.investmentDate, "MMM yyyy")}` : inverseRelationshipLabel(r.type)}
                      </span>
                    </Link>
                  ))
                )}
                <div className="mt-3.5 text-xs text-[var(--color-muted)]">Investment thesis</div>
                <p className="mt-1 text-[13px] leading-relaxed">{org.investmentThesisSummary || "—"}</p>
              </div>
              <div>
                <h2 className="m-0 text-base font-medium">Other companies these investors own</h2>
                {siblingPortcos.length === 0 ? (
                  <p className="mt-2.5 text-sm text-[var(--color-muted)]">No other portfolio companies found for these investors.</p>
                ) : (
                  siblingPortcos.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/organisations/${r.targetOrganizationId}`}
                      className={`flex items-center gap-3 py-2.5 text-[var(--color-ink)] no-underline ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2.5 border-t border-[var(--color-line)]"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px]">{r.targetOrganization.name}</span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          via {r.sourceOrganization.name} · {r.exitDate ? `exited ${format(r.exitDate, "MMM yyyy")}` : r.investmentDate ? `since ${format(r.investmentDate, "MMM yyyy")}` : ""}
                        </span>
                      </span>
                      <Badge tone={siblingHasLiveMandate.has(r.targetOrganizationId) ? "info" : "neutral"}>
                        {siblingHasLiveMandate.has(r.targetOrganizationId) ? "Live mandate" : "Exited"}
                      </Badge>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ) : org.type === "PE_FUND" ? (
            <section className="grid grid-cols-1 gap-[18px_32px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-[18px] sm:grid-cols-2">
              <div>
                <h2 className="m-0 text-base font-medium">Fund facts</h2>
                <dl className="mt-2.5 flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Current fund / vintage</dt>
                    <dd>{org.fundVintageOrCurrentFundName || "—"}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">AUM</dt>
                    <dd>{formatMoney(org.aumAmount, org.aumCurrency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                    <dt className="text-[var(--color-muted)]">Strategies</dt>
                    <dd>{org.investorStrategies.map((s) => s.strategy.name).join(", ") || "—"}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h2 className="m-0 text-base font-medium">Full portfolio</h2>
                {org.relationshipsAsSource.length === 0 ? (
                  <p className="mt-2.5 text-sm text-[var(--color-muted)]">No portfolio relationships recorded yet.</p>
                ) : (
                  org.relationshipsAsSource.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/organisations/${r.targetOrganizationId}`}
                      className={`flex items-center gap-3 py-2.5 text-[var(--color-ink)] no-underline ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2.5 border-t border-[var(--color-line)]"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px]">{r.targetOrganization.name}</span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          {forwardRelationshipLabel(r.type)} {r.investmentDate ? `· since ${format(r.investmentDate, "MMM yyyy")}` : ""}
                        </span>
                      </span>
                      <Badge tone={r.exitDate ? "neutral" : "info"}>{r.exitDate ? "Exited" : "Live"}</Badge>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Card>
            <CardContent className="p-4 pb-2">
              <div className="flex justify-between">
                <h3 className="m-0 text-sm font-medium">People ({org.personAssociations.length})</h3>
                <Link href={`/people/new?organizationId=${org.id}`} className="text-[13px] text-[var(--color-ink2)] no-underline">
                  + Add
                </Link>
              </div>
              {org.personAssociations.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-muted)]">No people linked.</p>
              ) : (
                org.personAssociations.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/people/${a.personId}`}
                    className={`flex items-center gap-2.5 py-2.5 text-[var(--color-ink)] no-underline ${i > 0 ? "border-t border-[var(--color-line)]" : "mt-2 border-t border-[var(--color-line)]"}`}
                  >
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[10.5px] font-semibold text-[var(--color-ink2)]">
                      {initials(a.person.firstName, a.person.lastName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px]">{a.person.firstName} {a.person.lastName}</span>
                      <span className="block truncate text-xs text-[var(--color-muted)]">
                        {a.isPrimaryContact ? "Primary" : a.stakeholderRoles[0] ? label(a.stakeholderRoles[0]) : "—"}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="m-0 text-sm font-medium">Signals</h3>
              {intelligence.length === 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">No signals yet.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {intelligence.slice(0, 3).map((i) => (
                    <Link key={i.id} href={`/intelligence/${i.id}`} className="text-[13px] text-[var(--color-ink)] no-underline">
                      {i.title}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 pb-1.5">
              <h3 className="m-0 mb-2 text-sm font-medium">Details</h3>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Owner</span>
                <span>{org.relationshipOwner ? `${org.relationshipOwner.firstName} ${org.relationshipOwner.lastName}` : "—"}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Ownership</span>
                <span>{org.ownershipType?.name || "—"}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Headquarters</span>
                <span>{[org.hqCity, org.hqCountryCode ? countryName(org.hqCountryCode) : null].filter(Boolean).join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                <span className="text-[var(--color-muted)]">Source</span>
                <span>{label(org.source)}</span>
              </div>
              {org.website || org.linkedinUrl ? (
                <div className="flex justify-between border-t border-[var(--color-line)] py-2 text-[13px]">
                  <span className="text-[var(--color-muted)]">Links</span>
                  <span className="flex gap-2">
                    {org.website ? (
                      <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-ink2)]">
                        Site <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    {org.linkedinUrl ? (
                      <a href={org.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-ink2)]">
                        LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
          {user.role === "ADMIN" && org.archivedAt ? (
            <div className="flex flex-col gap-2">
              <form action={() => restoreRecordAction("ORGANIZATION", org.id)}>
                <Button type="submit" variant="secondary" className="w-full">
                  <ArchiveRestore className="h-[14px] w-[14px]" /> Restore
                </Button>
              </form>
            </div>
          ) : null}
        </aside>
      </div>

      <section className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-[22px] py-[18px]">
        <h2 className="m-0 mb-3.5 text-base font-medium">Activity</h2>
        <Timeline items={timeline} emptyLabel="Nothing logged yet — use “Log activity” above to record a call, email, or note." />
      </section>

      <Tabs defaultValue="relationships">
        <TabsList>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          {canViewAuditLog(user.role) ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>

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
