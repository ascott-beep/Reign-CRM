"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CANDIDATE_BOARD_COLUMNS, candidateBoardColumn, candidatePlainStatus, type CandidateBoardColumn } from "@/lib/rules";
import { initials, cn } from "@/lib/utils";
import { changeProcessStageAction } from "./candidate-process-actions";
import { ProcessStageDialog, type ProcessStageDialogResult } from "./process-stage-dialog";
import { ProcessDetailDialog } from "./process-detail-dialog";
import type { CandidateProcessStage } from "@prisma/client";

export type BoardCandidate = {
  id: string;
  candidateFirstName: string;
  candidateName: string;
  candidateTitle: string | null;
  candidateCompany: string | null;
  stage: CandidateProcessStage;
};

/** The raw stage used when a candidate is dropped into (or moved to) a column that groups several stored stages. */
const CANONICAL_STAGE_FOR_COLUMN: Record<CandidateBoardColumn, CandidateProcessStage> = {
  Longlist: "LONGLISTED",
  Approached: "CONTACTED",
  Interested: "INTERESTED",
  Shortlist: "SUBMITTED",
  "Client interviews": "FIRST_INTERVIEW",
  Offer: "OFFER",
  Placed: "PLACED",
};

function Card({ c, onOpenDetail }: { c: BoardCandidate; onOpenDetail: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20, boxShadow: "var(--shadow-overlay)" } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "box-border flex w-full cursor-default items-start gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-2.5 text-[var(--color-ink)]",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[11px] font-semibold text-[var(--color-ink2)]">
        {initials(c.candidateFirstName, c.candidateName.split(" ").slice(-1)[0] ?? "")}
      </span>
      <button type="button" onClick={() => onOpenDetail(c.id)} className="min-w-0 flex-1 cursor-pointer text-left">
        <span className="block truncate text-[13.5px]">{c.candidateName}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
          {[c.candidateTitle, c.candidateCompany].filter(Boolean).join(" · ")}
        </span>
      </button>
      <CardMenu candidate={c} />
    </div>
  );
}

function CardMenu({ candidate }: { candidate: BoardCandidate }) {
  const [exitOpen, setExitOpen] = useState(false);
  const currentColumn = candidateBoardColumn(candidate.stage);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Candidate actions"
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-active)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CANDIDATE_BOARD_COLUMNS.filter((col) => col !== currentColumn && col !== "Placed").map((col) => (
            <DropdownMenuItem key={col} onSelect={() => changeProcessStageAction({ candidateProcessId: candidate.id, toStage: CANONICAL_STAGE_FOR_COLUMN[col] })}>
              Move to {col}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setExitOpen(true)} className="text-[var(--color-warn)]">
            Not progressed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProcessStageDialog
        open={exitOpen}
        candidateFirstName={candidate.candidateFirstName}
        context={candidate.candidateCompany ?? ""}
        onCancel={() => setExitOpen(false)}
        onConfirm={(result: ProcessStageDialogResult) => {
          changeProcessStageAction({ candidateProcessId: candidate.id, ...result });
          setExitOpen(false);
        }}
      />
    </>
  );
}

function Column({ column, items, onOpenDetail }: { column: CandidateBoardColumn; items: BoardCandidate[]; onOpenDetail: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[216px] shrink-0 flex-col gap-2 rounded-[6px] border bg-[var(--color-sunk)] p-2",
        isOver ? "border-[var(--color-navy)]" : "border-[var(--color-line)]",
      )}
    >
      <div className="flex items-baseline justify-between px-1.5 pb-1 pt-0.5">
        <span className="text-[13.5px] font-medium">{column}</span>
        <span className="text-xs text-[var(--color-muted)]">{items.length}</span>
      </div>
      {items.map((c) => (
        <Card key={c.id} c={c} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}

export function CandidateBoard({ candidates }: { candidates: BoardCandidate[] }) {
  const [items, setItems] = useState(candidates);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(CANDIDATE_BOARD_COLUMNS.map((c) => [c, [] as BoardCandidate[]])) as unknown as Record<CandidateBoardColumn, BoardCandidate[]>;
    const hidden: BoardCandidate[] = [];
    for (const c of items) {
      const column = candidateBoardColumn(c.stage);
      if (column) grouped[column]!.push(c);
      else hidden.push(c);
    }
    return { grouped, hidden };
  }, [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const toColumn = over.id as CandidateBoardColumn;
    const current = items.find((i) => i.id === id);
    if (!current || candidateBoardColumn(current.stage) === toColumn || toColumn === "Placed") return;
    const toStage = CANONICAL_STAGE_FOR_COLUMN[toColumn];
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: toStage } : i)));
    changeProcessStageAction({ candidateProcessId: id, toStage }).catch(() => setItems(candidates));
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext id="candidate-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ minHeight: 120 }}>
          {CANDIDATE_BOARD_COLUMNS.filter((c) => c !== "Placed" || columns.grouped.Placed.length > 0).map((c) => (
            <Column key={c} column={c} items={columns.grouped[c]} onOpenDetail={setDetailId} />
          ))}
        </div>
      </DndContext>

      {columns.hidden.length > 0 ? (
        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          <button
            type="button"
            onClick={() => setHiddenOpen((v) => !v)}
            className="flex h-10 w-full items-center justify-between px-4 text-[13.5px] text-[var(--color-ink2)]"
          >
            <span>
              {columns.hidden.length} not progressed or withdrawn
            </span>
            {hiddenOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {hiddenOpen ? (
            <div className="flex flex-col">
              {columns.hidden.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetailId(c.id)}
                  className={cn("flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] text-[var(--color-ink)]", i > 0 && "border-t border-[var(--color-line)]")}
                >
                  <span className="truncate">{c.candidateName}</span>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">{candidatePlainStatus(c.stage).label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ProcessDetailDialog candidateProcessId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
