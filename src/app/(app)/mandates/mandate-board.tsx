"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NextActionDot } from "@/components/ui/next-action-dot";
import { label } from "@/lib/labels";
import type { NextActionStatus } from "@/lib/next-action-status";
import { changeMandateStatusAction } from "./actions";
import { MandateStatusDialog } from "./mandate-status-dialog";

export type BoardMandate = {
  id: string;
  reference: string;
  title: string;
  status: string;
  organizationName: string;
  ownerName: string;
  priority: string;
  confidentiality: string;
  candidateCount: number;
  activeCandidateCount: number;
  nextActionStatus: NextActionStatus;
};

const STATUSES = ["BRIEF_RECEIVED", "SEARCH_ACTIVE", "LONGLISTING", "SHORTLISTING", "INTERVIEWING", "OFFER", "FILLED", "CANCELLED", "ON_HOLD"];
const REASON_REQUIRED = new Set(["CANCELLED", "ON_HOLD"]);

function Draggable({ m }: { m: BoardMandate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: m.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <Card className="cursor-grab active:cursor-grabbing">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/mandates/${m.id}`} className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]" onClick={(e) => isDragging && e.preventDefault()}>
              {m.reference}
            </Link>
            <NextActionDot status={m.nextActionStatus} className="mt-0.5" />
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">{m.title}</p>
          <p className="text-xs text-[var(--color-ink-subtle)]">{m.organizationName}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <Badge tone={m.priority === "CRITICAL" ? "danger" : m.priority === "HIGH" ? "warning" : "neutral"}>{label(m.priority)}</Badge>
            {m.confidentiality !== "OPEN" ? <Badge tone="info">{label(m.confidentiality)}</Badge> : null}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2">
            <p className="text-xs text-[var(--color-ink-subtle)]">{m.ownerName}</p>
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-ink)]" title={`${m.candidateCount} total, ${m.activeCandidateCount} active in the pipeline`}>
              <Users className="h-3 w-3" /> {m.activeCandidateCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Column({ status, items }: { status: string; items: BoardMandate[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`flex w-64 shrink-0 flex-col rounded-lg border ${isOver ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"} bg-[var(--color-canvas)]`}>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{label(status)}</span>
        <span className="text-xs text-[var(--color-ink-subtle)]">{items.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 120 }}>
        {items.map((m) => (
          <Draggable key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

export function MandateBoard({ initialMandates }: { initialMandates: BoardMandate[] }) {
  const [items, setItems] = useState(initialMandates);
  const [pendingMove, setPendingMove] = useState<{ id: string; toStatus: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Require a small pointer move before a drag activates, so a plain click
  // on the reference link opens the mandate instead of being swallowed as a
  // zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped: Record<string, BoardMandate[]> = Object.fromEntries(STATUSES.map((s) => [s, []]));
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
    if (REASON_REQUIRED.has(toStatus)) {
      setPendingMove({ id, toStatus });
      return;
    }
    applyMove(id, toStatus);
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
      <DndContext id="mandate-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
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
    </div>
  );
}
