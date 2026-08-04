"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { changeOpportunityStageAction } from "./actions";
import { StageChangeDialog } from "./stage-change-dialog";

export type BoardOpportunity = {
  id: string;
  name: string;
  stage: string;
  organizationName: string;
  potentialRoleTitle: string | null;
  estimatedFeeAmount: string | null;
  estimatedFeeCurrency: string | null;
  probability: number;
  ownerName: string;
  expectedDecisionDate: string | null;
  hasOverdueTask: boolean;
};

const STAGES = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS", "WON", "LOST", "ON_HOLD"];
const TERMINAL_STAGES = new Set(["WON", "LOST", "ON_HOLD"]);

function Draggable({ opp }: { opp: BoardOpportunity }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <Card className="cursor-grab active:cursor-grabbing">
        <CardContent className="p-3">
          <Link href={`/opportunities/${opp.id}`} className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]" onClick={(e) => isDragging && e.preventDefault()}>
            {opp.name}
          </Link>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{opp.organizationName}</p>
          {opp.potentialRoleTitle ? <p className="text-xs text-[var(--color-ink-subtle)]">{opp.potentialRoleTitle}</p> : null}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span>{formatMoney(opp.estimatedFeeAmount, opp.estimatedFeeCurrency)}</span>
            <Badge tone="info">{opp.probability}%</Badge>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink-subtle)]">
            <span>{opp.ownerName}</span>
            {opp.expectedDecisionDate ? <span>{format(new Date(opp.expectedDecisionDate), "d MMM")}</span> : null}
          </div>
          {opp.hasOverdueTask ? (
            <Badge tone="warning" className="mt-2">
              No next action
            </Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Column({ stage, items }: { stage: string; items: BoardOpportunity[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const value = items.reduce((sum, i) => sum + (i.estimatedFeeAmount ? Number(i.estimatedFeeAmount) : 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border ${isOver ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"} bg-[var(--color-canvas)]`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{label(stage)}</span>
        <span className="text-xs text-[var(--color-ink-subtle)]">{items.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 120 }}>
        {items.map((o) => (
          <Draggable key={o.id} opp={o} />
        ))}
      </div>
      {value > 0 ? (
        <div className="border-t border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-subtle)]">
          {formatMoney(value, items[0]?.estimatedFeeCurrency ?? "GBP")}
        </div>
      ) : null}
    </div>
  );
}

export function OpportunityBoard({ initialOpportunities }: { initialOpportunities: BoardOpportunity[] }) {
  const [items, setItems] = useState(initialOpportunities);
  const [pendingMove, setPendingMove] = useState<{ id: string; toStage: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Require a small pointer move before a drag activates, so a plain click
  // (which fires a mousedown/mouseup at effectively the same coordinates)
  // opens/navigates the card instead of being swallowed as a zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, BoardOpportunity[]> = Object.fromEntries(STAGES.map((s) => [s, []]));
    for (const item of items) grouped[item.stage]?.push(item);
    return grouped;
  }, [items]);

  function applyMove(id: string, toStage: string, extra?: { lossReason?: string; lossExplanation?: string; onHoldReason?: string }) {
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

    if (TERMINAL_STAGES.has(toStage)) {
      setPendingMove({ id, toStage });
      return;
    }
    applyMove(id, toStage);
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} items={columns[stage] ?? []} />
          ))}
        </div>
        <DragOverlay />
      </DndContext>
      <StageChangeDialog
        open={pendingMove !== null}
        toStage={pendingMove?.toStage ?? null}
        onCancel={() => setPendingMove(null)}
        onConfirm={(extra) => {
          if (pendingMove) applyMove(pendingMove.id, pendingMove.toStage, extra);
          setPendingMove(null);
        }}
      />
    </div>
  );
}
