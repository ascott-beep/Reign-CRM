import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateWorkspaceAction, updateStaleThresholdsAction, updateAskAtlasEnabledAction } from "../actions";

export default async function SettingsWorkspacePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } });
  const staleThresholds = workspace.staleThresholds as { personDays: number; priorityOrgDays: number; opportunityDays: number; candidateProcessDays: number };

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-xl">
        <CardContent className="pt-4">
          <form action={updateWorkspaceAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Workspace name</label>
              <input name="name" defaultValue={workspace.name} placeholder="e.g. Reign Partners" className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Default timezone</label>
              <input name="defaultTimezone" defaultValue={workspace.defaultTimezone} placeholder="e.g. Europe/London" className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Brand accent (hex)</label>
              <div className="flex items-center gap-2">
                <input name="brandAccent" defaultValue={workspace.brandAccent} placeholder="e.g. #0C2139" className="h-9 w-40 rounded-md border border-[var(--color-border-strong)] px-3 text-sm" />
                <span className="h-9 w-9 rounded-md border border-[var(--color-border)]" style={{ backgroundColor: workspace.brandAccent }} />
              </div>
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Drives the primary accent colour across the app (buttons, active states).
              </p>
            </div>
            <div>
              <Button type="submit">Save workspace settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
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

      <Card className="max-w-xl">
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
