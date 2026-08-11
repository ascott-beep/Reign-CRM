"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { CANDIDATE_PROCESS_BOARD_STAGES } from "@/lib/validation/candidate-process";
import { changeProcessStageAction } from "./candidate-process-actions";
import { ProcessStageDialog } from "./process-stage-dialog";
import { ProcessDetailDialog } from "./process-detail-dialog";
import { OfferDialog } from "./offer-dialog";
import { PlaceCandidateDialog } from "./place-candidate-dialog";

export type BoardProcess = {
  id: string;
  stage: string;
  candidateName: string;
  candidateRating: string | null;
  overallScore: number | null;
};

const REASON_STAGES = new Set(["REJECTED", "WITHDRAWN"]);

function Draggable({ p, onOpen }: { p: BoardProcess; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <Card
        onClick={() => !isDragging && onOpen(p.id)}
        className="cursor-grab transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)] active:cursor-grabbing active:translate-y-0 active:bg-[var(--color-highlight-subtle)]"
      >
        <CardContent className="p-2.5">
          <p className="text-sm font-medium text-[var(--color-ink)]">{p.candidateName}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {p.candidateRating ? <Badge tone="info">{label(p.candidateRating)}</Badge> : null}
            {p.overallScore ? <Badge tone="neutral">{p.overallScore}/5</Badge> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Column({ stage, items, onOpen }: { stage: string; items: BoardProcess[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`flex w-56 shrink-0 flex-col rounded-lg border ${isOver ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"} bg-[var(--color-canvas)]`}>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{label(stage)}</span>
        <span className="text-xs text-[var(--color-ink-subtle)]">{items.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5" style={{ minHeight: 100 }}>
        {items.map((p) => (
          <Draggable key={p.id} p={p} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function ProcessBoard({ initialProcesses }: { initialProcesses: BoardProcess[] }) {
  const [items, setItems] = useState(initialProcesses);
  const [pendingReason, setPendingReason] = useState<{ id: string; toStage: string } | null>(null);
  const [pendingOffer, setPendingOffer] = useState<string | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Require a small pointer move before a drag activates, so a plain click
  // (which fires a mousedown/mouseup at effectively the same coordinates)
  // opens the card instead of being swallowed as a zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, BoardProcess[]> = Object.fromEntries(CANDIDATE_PROCESS_BOARD_STAGES.map((s) => [s, []]));
    for (const item of items) grouped[item.stage]?.push(item);
    return grouped;
  }, [items]);

  function applyMove(id: string, toStage: string, extra?: Record<string, string>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: toStage } : i)));
    changeProcessStageAction({ candidateProcessId: id, toStage, ...extra }).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to move candidate.");
      setItems(initialProcesses);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const toStage = String(over.id);
    const current = items.find((i) => i.id === id);
    if (!current || current.stage === toStage) return;

    if (REASON_STAGES.has(toStage)) {
      setPendingReason({ id, toStage });
      return;
    }
    if (toStage === "OFFER") {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: toStage } : i)));
      setPendingOffer(id);
      return;
    }
    if (toStage === "PLACED") {
      setPendingPlacement(id);
      return;
    }
    applyMove(id, toStage);
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
      <DndContext id="process-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-4">
          {CANDIDATE_PROCESS_BOARD_STAGES.map((stage) => (
            <Column key={stage} stage={stage} items={columns[stage] ?? []} onOpen={setDetailId} />
          ))}
        </div>
      </DndContext>

      <ProcessStageDialog
        open={pendingReason !== null}
        toStage={pendingReason?.toStage ?? null}
        onCancel={() => setPendingReason(null)}
        onConfirm={(extra) => {
          if (pendingReason) applyMove(pendingReason.id, pendingReason.toStage, extra as Record<string, string>);
          setPendingReason(null);
        }}
      />
      <OfferDialog
        open={pendingOffer !== null}
        candidateProcessId={pendingOffer}
        onClose={() => {
          setPendingOffer(null);
          setItems(initialProcesses);
        }}
        onDone={() => setPendingOffer(null)}
      />
      <PlaceCandidateDialog
        open={pendingPlacement !== null}
        candidateProcessId={pendingPlacement}
        onClose={() => setPendingPlacement(null)}
        onDone={() => {
          setItems((prev) => prev.map((i) => (i.id === pendingPlacement ? { ...i, stage: "PLACED" } : i)));
          setPendingPlacement(null);
        }}
        onCancelDrag={() => setItems(initialProcesses)}
      />
      <ProcessDetailDialog
        candidateProcessId={detailId}
        onClose={() => setDetailId(null)}
        onStageChange={(id, stage) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage } : i)))}
      />
    </div>
  );
}
