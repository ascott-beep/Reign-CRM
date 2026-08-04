import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { PermissionDeniedState, EmptyState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { label } from "@/lib/labels";
import { format } from "date-fns";
import { updateWorkspaceAction, updateStaleThresholdsAction, updateStageProbabilitiesAction, toggleLookupItemAction } from "./actions";
import { CreateUserDialog, CreateLookupItemDialog, CreateTagDialog, CreateCustomFieldDialog } from "./settings-dialogs";
import { UserRowControls } from "./user-row-controls";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return (
      <PermissionDeniedState description="Settings are administrator-only. You can still manage your own profile." />
    );
  }

  const [
    workspace,
    users,
    sectors,
    practiceAreas,
    specialisms,
    investorStrategies,
    ownershipTypes,
    tags,
    customFields,
    importJobs,
    auditLogs,
  ] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.user.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { firstName: "asc" } }),
    prisma.sector.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.practiceArea.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.functionalSpecialism.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.investorStrategy.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.ownershipType.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { displayOrder: "asc" } }),
    prisma.tag.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
    prisma.customFieldDefinition.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } }),
    prisma.importJob.findMany({ where: { workspaceId: user.workspaceId }, include: { createdBy: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.auditLog.findMany({ where: { workspaceId: user.workspaceId }, include: { actor: true }, orderBy: { timestamp: "desc" }, take: 100 }),
  ]);

  const stageProbabilities = (workspace.opportunityStageProbabilities as Record<string, number> | null) ?? OPPORTUNITY_STAGE_PROBABILITY;
  const staleThresholds = workspace.staleThresholds as { personDays: number; priorityOrgDays: number; opportunityDays: number; candidateProcessDays: number };
  const editableStages = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS"];

  return (
    <div>
      <PageHeader title="Settings" description="Workspace-wide configuration. Administrator only." />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="stale">Stale Thresholds</TabsTrigger>
          <TabsTrigger value="taxonomies">Taxonomies</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="customfields">Custom Fields</TabsTrigger>
          <TabsTrigger value="imports">Import History</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="mb-3 flex justify-end">
            <CreateUserDialog />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role / Status</TableHead>
                <TableHead>Last login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.firstName} {u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <UserRowControls userId={u.id} role={u.role} active={u.active} isSelf={u.id === user.id} />
                  </TableCell>
                  <TableCell>{u.lastLoginAt ? format(u.lastLoginAt, "d MMM yyyy HH:mm") : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="workspace">
          <Card className="max-w-xl">
            <CardContent className="pt-4">
              <form action={updateWorkspaceAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Workspace name</label>
                  <input name="name" defaultValue={workspace.name} className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Default currency</label>
                    <input name="defaultCurrency" defaultValue={workspace.defaultCurrency} maxLength={3} className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Default timezone</label>
                    <input name="defaultTimezone" defaultValue={workspace.defaultTimezone} className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Brand accent (hex)</label>
                  <div className="flex items-center gap-2">
                    <input name="brandAccent" defaultValue={workspace.brandAccent} className="h-9 w-40 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
                    <span className="h-9 w-9 rounded-md border border-[var(--color-border)]" style={{ backgroundColor: workspace.brandAccent }} />
                  </div>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    Drives the primary accent colour across the app (buttons, active states). Reign Partners&apos; exact brand colour
                    could not be fetched automatically — reign.partners was unreachable from this build environment&apos;s network
                    policy — so this is a placeholder deep navy. Update it here once confirmed.
                  </p>
                </div>
                <div>
                  <Button type="submit">Save workspace settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card className="max-w-xl">
            <CardContent className="pt-4">
              <p className="mb-3 text-sm text-[var(--color-ink-subtle)]">Default win probability applied when an opportunity enters each stage.</p>
              <form action={updateStageProbabilitiesAction} className="flex flex-col gap-3">
                {editableStages.map((stage) => (
                  <div key={stage} className="flex items-center justify-between gap-4">
                    <label className="text-sm">{label(stage)}</label>
                    <div className="flex items-center gap-1">
                      <input
                        name={stage}
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={stageProbabilities[stage] ?? OPPORTUNITY_STAGE_PROBABILITY[stage]}
                        className="h-8 w-20 rounded-md border border-[var(--color-border-strong)] px-2 text-sm"
                      />
                      <span className="text-sm text-[var(--color-ink-subtle)]">%</span>
                    </div>
                  </div>
                ))}
                <div className="mt-2">
                  <Button type="submit">Save probabilities</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stale">
          <Card className="max-w-xl">
            <CardContent className="pt-4">
              <form action={updateStaleThresholdsAction} className="flex flex-col gap-4">
                {[
                  { key: "personDays", label: "Active person relationship — no activity for" },
                  { key: "priorityOrgDays", label: "Priority organisation — no activity for" },
                  { key: "opportunityDays", label: "Active opportunity — no movement for" },
                  { key: "candidateProcessDays", label: "Active candidate process — no movement for" },
                ].map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-4">
                    <label className="text-sm">{f.label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        name={f.key}
                        type="number"
                        min={1}
                        defaultValue={staleThresholds[f.key as keyof typeof staleThresholds]}
                        className="h-8 w-20 rounded-md border border-[var(--color-border-strong)] px-2 text-sm"
                      />
                      <span className="text-sm text-[var(--color-ink-subtle)]">days</span>
                    </div>
                  </div>
                ))}
                <div>
                  <Button type="submit">Save thresholds</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxonomies">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { kind: "sector" as const, label: "Sector", items: sectors },
              { kind: "practiceArea" as const, label: "Practice Area", items: practiceAreas },
              { kind: "functionalSpecialism" as const, label: "Functional Specialism", items: specialisms },
              { kind: "investorStrategy" as const, label: "Investor Strategy", items: investorStrategies },
              { kind: "ownershipType" as const, label: "Ownership", items: ownershipTypes },
            ].map((group) => (
              <Card key={group.kind}>
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{group.label}</h3>
                    <CreateLookupItemDialog kind={group.kind} label={group.label} />
                  </div>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-sm">
                        <span className={item.active ? "" : "text-[var(--color-ink-subtle)] line-through"}>{item.name}</span>
                        <form action={toggleLookupItemAction.bind(null, group.kind, item.id, !item.active)}>
                          <button type="submit" className="text-xs text-[var(--color-accent)]">
                            {item.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tags">
          <div className="mb-3 flex justify-end">
            <CreateTagDialog />
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t.id} tone="neutral">
                {t.name}
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customfields">
          <div className="mb-3 flex justify-end">
            <CreateCustomFieldDialog />
          </div>
          {customFields.length === 0 ? (
            <EmptyState title="No custom fields defined" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customFields.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.label}</TableCell>
                    <TableCell>{label(f.entityType)}</TableCell>
                    <TableCell>{label(f.fieldType)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="imports">
          {importJobs.length === 0 ? (
            <EmptyState
              title="No imports yet"
              action={
                <div className="mt-2 flex gap-2">
                  <Button size="sm" asChild>
                    <Link href="/import/organisations">Import organisations</Link>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/import/people">Import people</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Success / Error</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.originalFilename}</TableCell>
                    <TableCell>{label(j.entityType)}</TableCell>
                    <TableCell>{j.totalRows}</TableCell>
                    <TableCell>
                      {j.successRows} / {j.errorRows}
                    </TableCell>
                    <TableCell>{j.createdBy.firstName} {j.createdBy.lastName}</TableCell>
                    <TableCell>{format(j.createdAt, "d MMM yyyy HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="audit">
          {auditLogs.length === 0 ? (
            <EmptyState title="No audit history yet" />
          ) : (
            <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-[var(--color-border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.entityType}</TableCell>
                      <TableCell>{label(a.action)}</TableCell>
                      <TableCell>{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System"}</TableCell>
                      <TableCell>{format(a.timestamp, "d MMM yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
