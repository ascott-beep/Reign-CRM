"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { LIVE_MANDATE_STATUSES, MANDATE_STAGE_BAR_LABELS } from "@/lib/rules";
import type { NextActionStatus } from "@/lib/next-action-status";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { changeMandateStatusAction } from "./actions";
import { MandateStatusDialog } from "./mandate-status-dialog";
import { MarkSearchFilledDialog } from "./mark-search-filled-dialog";

export type BoardMandate = {
  id: string;
  reference: string;
  title: string;
  status: string;
  organizationName: string;
  candidateCount: number;
  nextActionStatus: NextActionStatus;
};

const REASON_REQUIRED = new Set(["CANCELLED", "ON_HOLD"]);

function Card({ m }: { m: BoardMandate }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: m.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;

  function handleClick() {
    if (isDragging) return;
    router.push(`/mandates/${m.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`box-border flex h-[150px] cursor-grab flex-col gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3 text-[var(--color-ink)] active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <span className="min-w-0">
        <span className="line-clamp-2 min-h-[38px] text-[14.5px] font-medium leading-tight">{m.title}</span>
        <span className="mt-1 line-clamp-2 min-h-[34px] text-[13px] leading-tight text-[var(--color-muted)]">{m.organizationName}</span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-2.5">
        <span className="text-[13.5px] text-[var(--color-ink2)]">
          {m.candidateCount} candidate{m.candidateCount === 1 ? "" : "s"}
        </span>
        <NextActionDot status={m.nextActionStatus} />
      </span>
    </div>
  );
}

function Column({ status, items }: { status: (typeof LIVE_MANDATE_STATUSES)[number]; items: BoardMandate[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col gap-2 rounded-[6px] border bg-[var(--color-sunk)] p-2 ${isOver ? "border-[var(--color-navy)]" : "border-[var(--color-line)]"}`}
    >
      <div className="px-1.5 pb-1 pt-0.5">
        <div className="text-[14px] font-medium">{MANDATE_STAGE_BAR_LABELS[status]}</div>
        <div className="mt-1 text-[12.5px] text-[var(--color-muted)]">
          {items.length === 0 ? "None at this stage" : `${items.length} search${items.length === 1 ? "" : "es"}`}
        </div>
      </div>
      {items.map((m) => (
        <Card key={m.id} m={m} />
      ))}
    </div>
  );
}

export function MandateBoard({ initialMandates }: { initialMandates: BoardMandate[] }) {
  const [items, setItems] = useState(initialMandates);
  const [pendingMove, setPendingMove] = useState<{ id: string; toStatus: string } | null>(null);
  const [fillMandateId, setFillMandateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Require a small pointer move before a drag activates, so a plain click
  // opens the mandate instead of being swallowed as a zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, BoardMandate[]> = Object.fromEntries(LIVE_MANDATE_STATUSES.map((s) => [s, []]));
    for (const item of items) grouped[item.status]?.push(item);
    return grouped;
  }, [items]);

  function applyMove(id: string, toStatus: string, extra?: { cancellationReason?: string; onHoldReason?: string }) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: toStatus } : i)));
    changeMandateStatusAction({ mandateId: id, toStatus, ...extra }).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to move mandate.");
      setItems(initialMandates);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const toStatus = String(over.id);
    const current = items.find((i) => i.id === id);
    if (!current || current.status === toStatus) return;
    if (toStatus === "FILLED") {
      setFillMandateId(id);
      return;
    }
    if (REASON_REQUIRED.has(toStatus)) {
      setPendingMove({ id, toStatus });
      return;
    }
    applyMove(id, toStatus);
  }

  return (
    <div className="flex flex-1 flex-col">
      {error ? <p className="mb-3 text-sm text-[var(--color-warn)]">{error}</p> : null}
      <DndContext id="mandate-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-6 gap-2 overflow-x-auto" style={{ minHeight: 420 }}>
          {LIVE_MANDATE_STATUSES.map((s) => (
            <Column key={s} status={s} items={columns[s] ?? []} />
          ))}
        </div>
      </DndContext>
      <MandateStatusDialog
        open={pendingMove !== null}
        toStatus={pendingMove?.toStatus ?? null}
        onCancel={() => setPendingMove(null)}
        onConfirm={(extra) => {
          if (pendingMove) applyMove(pendingMove.id, pendingMove.toStatus, extra);
          setPendingMove(null);
        }}
      />
      <MarkSearchFilledDialog
        open={fillMandateId !== null}
        mandateId={fillMandateId}
        onClose={() => {
          setItems(initialMandates);
          setFillMandateId(null);
        }}
        onDone={() => {
          setItems((prev) => prev.map((i) => (i.id === fillMandateId ? { ...i, status: "FILLED" } : i)));
          setFillMandateId(null);
        }}
      />
    </div>
  );
}
