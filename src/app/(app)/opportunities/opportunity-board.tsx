"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { formatMoney, formatConvertedMoney, convertedLabel, cn } from "@/lib/utils";
import { convertedTotal } from "@/lib/currency";
import { OPEN_OPPORTUNITY_STAGES, OPPORTUNITY_STAGE_SHORT_LABEL } from "@/lib/rules";
import type { NextActionStatus } from "@/lib/next-action-status";
import { changeOpportunityStageAction } from "./actions";
import { LostReasonDialog, type LostReasonResult } from "./lost-reason-dialog";
import { OnHoldDialog, type OnHoldResult } from "./on-hold-dialog";
import { CreateMandateDialog } from "./create-mandate-dialog";

export type BoardOpportunity = {
  id: string;
  name: string;
  stage: string;
  organizationName: string;
  potentialRoleTitle: string | null;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string | null;
  /** value × probability, pre-computed server-side (lib/rules.ts weightedOpportunityValue). */
  weightedValue: number;
  nextActionStatus: NextActionStatus;
};

function Card({ opp }: { opp: BoardOpportunity }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;

  function handleClick() {
    if (isDragging) return;
    router.push(`/opportunities/${opp.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        "box-border flex h-[150px] cursor-default flex-col gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3 text-[var(--color-ink)]",
        isDragging && "opacity-40",
      )}
    >
      <span className="min-w-0">
        <span className="line-clamp-2 min-h-[38px] text-[14.5px] font-medium leading-tight">{opp.potentialRoleTitle ?? opp.name}</span>
        <span className="mt-1 line-clamp-2 min-h-[34px] text-[13px] leading-tight text-[var(--color-muted)]">{opp.organizationName}</span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-2.5">
        <span className="text-sm">{formatMoney(opp.estimatedFeeAmount, opp.estimatedFeeCurrency)}</span>
        <NextActionDot status={opp.nextActionStatus} />
      </span>
    </div>
  );
}

export function OpportunityBoard({
  initialOpportunities,
  maxOpenWeighted,
  displayCurrency,
  ratesToGbp,
}: {
  initialOpportunities: BoardOpportunity[];
  maxOpenWeighted: number;
  displayCurrency: string;
  ratesToGbp: Record<string, number>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialOpportunities);
  const [pendingLost, setPendingLost] = useState<string | null>(null);
  const [pendingHold, setPendingHold] = useState<string | null>(null);
  const [pendingWon, setPendingWon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, BoardOpportunity[]> = Object.fromEntries(OPEN_OPPORTUNITY_STAGES.map((s) => [s, []]));
    for (const item of items) grouped[item.stage]?.push(item);
    return grouped;
  }, [items]);

  function applyMove(id: string, toStage: string, extra?: Record<string, unknown>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: toStage } : i)));
    changeOpportunityStageAction({ opportunityId: id, toStage, ...extra }).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to move opportunity.");
      setItems(initialOpportunities);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const toStage = String(over.id);
    const current = items.find((i) => i.id === id);
    if (!current || current.stage === toStage) return;

    if (toStage === "WON") {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: toStage } : i)));
      changeOpportunityStageAction({ opportunityId: id, toStage }).then(() => setPendingWon(id));
      return;
    }
    if (toStage === "LOST") {
      setPendingLost(id);
      return;
    }
    if (toStage === "ON_HOLD") {
      setPendingHold(id);
      return;
    }
    applyMove(id, toStage);
  }

  const pendingLostOpp = items.find((i) => i.id === pendingLost);
  const pendingHoldOpp = items.find((i) => i.id === pendingHold);

  const pct = (w: number) => (maxOpenWeighted > 0 ? Math.min(100, (w / maxOpenWeighted) * 100) : 0);

  return (
    <div className="flex flex-1 flex-col">
      {error ? <p className="mb-3 text-sm text-[var(--color-warn)]">{error}</p> : null}
      <DndContext id="opportunity-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-6 gap-2 overflow-x-auto" style={{ minHeight: 420 }}>
          {OPEN_OPPORTUNITY_STAGES.map((stage) => {
            const stageItems = columns[stage] ?? [];
            const { amount: weighted, approx } = convertedTotal(
              stageItems.map((o) => ({ amount: o.weightedValue, currency: o.estimatedFeeCurrency })),
              displayCurrency,
              ratesToGbp,
            );
            return (
              <div key={stage} className="contents">
                <ColumnShell
                  stage={stage}
                  items={stageItems}
                  weighted={weighted}
                  approx={approx}
                  displayCurrency={displayCurrency}
                  widthPct={pct(weighted)}
                />
              </div>
            );
          })}
        </div>
      </DndContext>

      <LostReasonDialog
        open={pendingLostOpp !== undefined}
        context={
          pendingLostOpp
            ? `${pendingLostOpp.potentialRoleTitle ?? pendingLostOpp.name} · ${pendingLostOpp.organizationName} · ${formatMoney(pendingLostOpp.estimatedFeeAmount, pendingLostOpp.estimatedFeeCurrency)}`
            : undefined
        }
        onCancel={() => setPendingLost(null)}
        onConfirm={(result: LostReasonResult) => {
          if (pendingLost) applyMove(pendingLost, "LOST", result);
          setPendingLost(null);
        }}
      />
      <OnHoldDialog
        open={pendingHoldOpp !== undefined}
        context={pendingHoldOpp ? `${pendingHoldOpp.potentialRoleTitle ?? pendingHoldOpp.name} · ${pendingHoldOpp.organizationName}` : undefined}
        onCancel={() => setPendingHold(null)}
        onConfirm={(result: OnHoldResult) => {
          if (pendingHold) applyMove(pendingHold, "ON_HOLD", result);
          setPendingHold(null);
        }}
      />
      <CreateMandateDialog
        open={pendingWon !== null}
        opportunityId={pendingWon}
        onClose={() => {
          setPendingWon(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ColumnShell({
  stage,
  items,
  weighted,
  approx,
  displayCurrency,
  widthPct,
}: {
  stage: (typeof OPEN_OPPORTUNITY_STAGES)[number];
  items: BoardOpportunity[];
  weighted: number;
  approx: boolean;
  displayCurrency: string;
  widthPct: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn("flex min-w-0 flex-col gap-2 rounded-[6px] border bg-[var(--color-sunk)] p-2", isOver ? "border-[var(--color-navy)]" : "border-[var(--color-line)]")}
    >
      <div className="px-1.5 pb-1 pt-0.5">
        <div className="text-[14px] font-medium">{OPPORTUNITY_STAGE_SHORT_LABEL[stage]}</div>
        <div className="mt-1.5 flex justify-between gap-2 text-[13px]">
          <span className="text-[var(--color-muted)]">{convertedLabel("Likely fees", approx, displayCurrency)}</span>
          <span>{formatConvertedMoney(weighted, approx, displayCurrency)}</span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-[var(--color-track)]">
          <div className="h-1 rounded-full bg-[var(--color-bar)]" style={{ width: `${widthPct}%` }} />
        </div>
      </div>
      {items.map((o) => (
        <Card key={o.id} opp={o} />
      ))}
    </div>
  );
}
