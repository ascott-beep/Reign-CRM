import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, canViewAuditLog } from "@/lib/permissions";
import { EmptyState, PermissionDeniedState } from "@/components/shell/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { describeAuditLog } from "@/lib/audit";
import { formatDateTime, isTodayInLondon, isYesterdayInLondon, formatTime, startOfTodayInLondon } from "@/lib/datetime";
import { Download } from "lucide-react";

const RECORD_TYPES = ["Opportunity", "Mandate", "Person", "Organization", "Task", "User", "Workspace"];
const WHEN_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "7", label: "Last 7 days" },
  { value: "all", label: "All time" },
];

const RECORD_HREF: Record<string, (id: string) => string> = {
  Opportunity: (id) => `/opportunities/${id}`,
  Mandate: (id) => `/mandates/${id}`,
  Person: (id) => `/people/${id}`,
  Organization: (id) => `/organisations/${id}`,
  Task: (id) => `/tasks/${id}`,
};

function whenLabel(date: Date) {
  if (isTodayInLondon(date)) return `Today, ${formatTime(date)}`;
  if (isYesterdayInLondon(date)) return `Yesterday, ${formatTime(date)}`;
  return formatDateTime(date);
}

export default async function SettingsAuditLogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  if (!canViewAuditLog(user.role)) return <PermissionDeniedState description="This page is administrator-only." />;
  const sp = await searchParams;
  const actorId = typeof sp.who === "string" ? sp.who : undefined;
  const entityType = typeof sp.what === "string" ? sp.what : undefined;
  const when = typeof sp.when === "string" ? sp.when : "30";

  const since = when === "all" ? undefined : new Date(startOfTodayInLondon().getTime() - Number(when) * 24 * 60 * 60 * 1000);

  const [auditLogs, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        workspaceId: user.workspaceId,
        ...(actorId ? { actorId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(since ? { timestamp: { gte: since } } : {}),
      },
      include: { actor: true },
      orderBy: { timestamp: "desc" },
      take: 200,
    }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);

  function filterUrl(next: Partial<{ who: string; what: string; when: string }>) {
    const params = new URLSearchParams();
    const merged = { who: actorId ?? "", what: entityType ?? "", when, ...next };
    if (merged.who) params.set("who", merged.who);
    if (merged.what) params.set("what", merged.what);
    if (merged.when && merged.when !== "30") params.set("when", merged.when);
    const qs = params.toString();
    return qs ? `/settings/audit-log?${qs}` : "/settings/audit-log";
  }

  const exportParams = new URLSearchParams();
  if (actorId) exportParams.set("who", actorId);
  if (entityType) exportParams.set("what", entityType);
  if (when !== "30") exportParams.set("when", when);
  const exportQs = exportParams.toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium text-[var(--color-ink)]">Audit log</h2>
          <p className="text-sm text-[var(--color-ink-subtle)]">Every change anyone makes.</p>
        </div>
        <Button variant="secondary" asChild>
          <a href={`/api/settings/audit-log/export${exportQs ? `?${exportQs}` : ""}`}>
            <Download className="h-[14px] w-[14px]" /> Download
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterLink label="Anyone" active={!actorId} href={filterUrl({ who: "" })} />
        {actors.slice(0, 6).map((a) => (
          <FilterLink key={a.id} label={`${a.firstName} ${a.lastName}`} active={actorId === a.id} href={filterUrl({ who: a.id })} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterLink label="All records" active={!entityType} href={filterUrl({ what: "" })} />
        {RECORD_TYPES.map((t) => (
          <FilterLink key={t} label={t} active={entityType === t} href={filterUrl({ what: t })} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {WHEN_OPTIONS.map((o) => (
          <FilterLink key={o.value} label={o.label} active={when === o.value} href={filterUrl({ when: o.value })} />
        ))}
      </div>

      {auditLogs.length === 0 ? (
        <EmptyState title="No audit history yet" description="Changes anyone makes in Atlas will show up here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>What</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map((a) => {
              const href = RECORD_HREF[a.entityType]?.(a.entityId);
              const description = describeAuditLog(a);
              return (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-[var(--color-ink-subtle)]">{whenLabel(a.timestamp)}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System"}</TableCell>
                  <TableCell>
                    {description}
                    {href ? (
                      <>
                        {" on "}
                        <Link href={href} className="text-[var(--color-accent)] underline">
                          {a.entityType}
                        </Link>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-[var(--color-accent)] bg-[var(--color-active)] px-3 py-1 text-[13px] font-medium text-[var(--color-ink)]"
          : "rounded-full border border-[var(--color-line)] px-3 py-1 text-[13px] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
      }
    >
      {label}
    </Link>
  );
}
