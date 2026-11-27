import { GripVertical, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { label, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { EDITABLE_STAGES } from "@/lib/validation/opportunity";
import { LIVE_MANDATE_STATUSES } from "@/lib/rules";
import { updateStageProbabilitiesAction } from "../actions";

export default async function SettingsPipelineStagesPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const [workspace, opportunityCounts, mandateCounts] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.opportunity.groupBy({ by: ["stage"], where: { workspaceId: user.workspaceId, archivedAt: null }, _count: true }),
    prisma.mandate.groupBy({ by: ["status"], where: { workspaceId: user.workspaceId, archivedAt: null }, _count: true }),
  ]);
  const stageProbabilities = (workspace.opportunityStageProbabilities as Record<string, number> | null) ?? OPPORTUNITY_STAGE_PROBABILITY;
  const openCountByStage = Object.fromEntries(opportunityCounts.map((c) => [c.stage, c._count]));
  const liveCountByStatus = Object.fromEntries(mandateCounts.map((c) => [c.status, c._count]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium text-[var(--color-ink)]">Pipeline stages</h2>
        <p className="text-sm text-[var(--color-ink-subtle)]">The steps for each of the two pipelines.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold">Opportunities</h3>
          <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">Ends with Won or Lost. Those two can&apos;t be renamed.</p>
          <form action={updateStageProbabilitiesAction} className="flex flex-col">
            {EDITABLE_STAGES.map((stage, i) => (
              <div key={stage} className={i > 0 ? "flex items-center gap-3 border-t border-[var(--color-line)] py-2.5" : "flex items-center gap-3 py-2.5"}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-not-allowed text-[var(--color-muted)] opacity-50" />
                <span className="w-5 shrink-0 text-sm text-[var(--color-ink-subtle)]">{i + 1}</span>
                <span className="flex-1 text-sm text-[var(--color-ink)]">{label(stage)}</span>
                <div className="flex items-center gap-1">
                  <input
                    name={stage}
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={stageProbabilities[stage] ?? OPPORTUNITY_STAGE_PROBABILITY[stage]}
                    className="h-8 w-16 rounded-md border border-[var(--color-border-strong)] px-2 text-right text-sm"
                  />
                  <span className="text-xs text-[var(--color-ink-subtle)]">% win</span>
                </div>
                <span className="w-16 shrink-0 text-right text-sm text-[var(--color-ink-subtle)]">{openCountByStage[stage] ?? 0} open</span>
                <button type="button" disabled title="Renaming stages needs a small database change, not available yet" className="cursor-not-allowed text-[var(--color-muted)] opacity-50">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="mt-3">
              <Button type="submit">Save probabilities</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold">Mandates</h3>
          <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">Ends with Filled or Cancelled. Those can&apos;t be renamed.</p>
          <div className="flex flex-col">
            {LIVE_MANDATE_STATUSES.map((status, i) => (
              <div key={status} className={i > 0 ? "flex items-center gap-3 border-t border-[var(--color-line)] py-2.5" : "flex items-center gap-3 py-2.5"}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-not-allowed text-[var(--color-muted)] opacity-50" />
                <span className="w-5 shrink-0 text-sm text-[var(--color-ink-subtle)]">{i + 1}</span>
                <span className="flex-1 text-sm text-[var(--color-ink)]">{label(status)}</span>
                <span className="w-16 shrink-0 text-right text-sm text-[var(--color-ink-subtle)]">{liveCountByStatus[status] ?? 0} live</span>
                <button type="button" disabled title="Renaming stages needs a small database change, not available yet" className="cursor-not-allowed text-[var(--color-muted)] opacity-50">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--color-ink-subtle)]">
        These names come from the real stage values used everywhere else in Atlas. Reordering, renaming and deleting stages isn&apos;t available yet, it would need a small
        database change to make stage names editable rather than fixed.
      </p>
    </div>
  );
}
