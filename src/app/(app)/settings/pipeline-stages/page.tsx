import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { label, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { updateStageProbabilitiesAction } from "../actions";

const EDITABLE_STAGES = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS"];

export default async function SettingsPipelineStagesPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } });
  const stageProbabilities = (workspace.opportunityStageProbabilities as Record<string, number> | null) ?? OPPORTUNITY_STAGE_PROBABILITY;

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-4">
        <p className="mb-3 text-sm text-[var(--color-ink-subtle)]">Default win probability applied when an opportunity enters each stage.</p>
        <form action={updateStageProbabilitiesAction} className="flex flex-col gap-3">
          {EDITABLE_STAGES.map((stage) => (
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
  );
}
