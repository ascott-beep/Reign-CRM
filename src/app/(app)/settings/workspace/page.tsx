import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/iso";
import { updateWorkspaceAction, updateCurrencySettingsAction, updateStaleThresholdsAction, updateAskAtlasEnabledAction } from "../actions";

/** The purge job's retention window (src/app/api/cron/purge-archived/route.ts) -- fixed in code, not a workspace preference yet. */
const PURGE_AFTER_DAYS = 30;

export default async function SettingsWorkspacePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } });
  const staleThresholds = workspace.staleThresholds as { personDays: number; priorityOrgDays: number; opportunityDays: number; candidateProcessDays: number };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium text-[var(--color-ink)]">General</h2>
        <p className="text-sm text-[var(--color-ink-subtle)]">Settings for everyone at {workspace.name}.</p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Workspace</h3>
          </div>
          <form action={updateWorkspaceAction} className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[var(--color-ink-subtle)]">Company name</label>
              <input name="name" defaultValue={workspace.name} placeholder="e.g. Reign Partners" className="h-10 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[var(--color-ink-subtle)]">Time zone</label>
              <div className="flex h-10 items-center rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm text-[var(--color-ink-subtle)]">London (UK time)</div>
            </div>
            <div className="col-span-2">
              <Button type="submit">Save</Button>
            </div>
          </form>
          <form action={updateCurrencySettingsAction} className="mt-4 flex flex-col gap-1.5 border-t border-[var(--color-line)] pt-4">
            <label className="text-sm text-[var(--color-ink-subtle)]">Default currency</label>
            <div className="flex items-center gap-2">
              <Select name="defaultCurrency" defaultValue={workspace.defaultCurrency}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <h3 className="mb-3 text-sm font-semibold">Data</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[var(--color-ink)]">Export everything</p>
              <p className="text-xs text-[var(--color-ink-subtle)]">A zip of CSV files, emailed to you when ready. Not available yet.</p>
            </div>
            <Button variant="secondary" disabled>
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--color-line)] py-2">
            <div>
              <p className="text-sm text-[var(--color-ink)]">Keep deleted records for</p>
              <p className="text-xs text-[var(--color-ink-subtle)]">Then they are removed for good.</p>
            </div>
            <div className="flex h-9 items-center rounded-md border border-[var(--color-line)] bg-[var(--color-sunk)] px-3 text-sm text-[var(--color-ink-subtle)]">{PURGE_AFTER_DAYS} days</div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <h3 className="mb-1 text-sm font-semibold">Stale thresholds</h3>
          <p className="mb-3 text-xs text-[var(--color-ink-subtle)]">How long without activity before a record is flagged as stale.</p>
          <form action={updateStaleThresholdsAction} className="flex flex-col gap-4">
            {[
              { key: "personDays", label: "Active person relationship · no activity for" },
              { key: "priorityOrgDays", label: "Priority organisation · no activity for" },
              { key: "opportunityDays", label: "Active opportunity · no movement for" },
              { key: "candidateProcessDays", label: "Active candidate process · no movement for" },
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

      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <h3 className="mb-1 text-sm font-semibold">Ask Atlas</h3>
          <p className="mb-3 text-xs text-[var(--color-ink-subtle)]">The built-in AI search (⌘K questions and the Ask button on records). Switching this off hides it for everyone.</p>
          <form action={updateAskAtlasEnabledAction} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch name="askAtlasEnabled" defaultChecked={workspace.askAtlasEnabled} />
              Ask Atlas is {workspace.askAtlasEnabled ? "on" : "off"}
            </label>
            <div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
