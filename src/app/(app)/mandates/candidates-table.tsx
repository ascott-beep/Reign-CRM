"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { CANDIDATE_STEP_COUNT } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { changeProcessStageAction } from "./candidate-process-actions";
import { ProcessStageDialog, type ProcessStageDialogResult } from "./process-stage-dialog";
import { ProcessDetailDialog } from "./process-detail-dialog";

export type CandidateRow = {
  id: string;
  candidatePersonId: string;
  candidateFirstName: string;
  candidateName: string;
  candidateTitle: string | null;
  statusLabel: string;
  statusTone: "warning" | "success" | "neutral";
  step: number; // 1-6
  fit: string | null;
  nextStepText: string | null;
  /** The actual due date behind nextStepText, when there's a real task — only this gets coloured red when overdue. */
  nextStepDueDate: Date | null;
  nextStepUrgent: boolean;
  /** Rejected / withdrawn / on hold — hidden behind "Show" by default. */
  hidden: boolean;
};

const GRID = "grid grid-cols-[minmax(0,1.6fr)_170px_90px_64px_minmax(260px,1.5fr)] items-start gap-5";

function Row({ r, onOpenDetail, onExit }: { r: CandidateRow; onOpenDetail: (id: string) => void; onExit: ((r: CandidateRow) => void) | null }) {
  return (
    <div className={cn(GRID, "group border-t border-[var(--color-line)] py-4 text-[var(--color-ink)]", r.hidden && "opacity-70")}>
      <button type="button" onClick={() => onOpenDetail(r.id)} className="min-w-0 text-left">
        <span className="block truncate text-sm">{r.candidateName}</span>
        <span className="mt-0.5 block truncate text-[13px] text-[var(--color-muted)]">{r.candidateTitle ?? ""}</span>
      </button>
      <span>
        <Badge tone={r.statusTone}>{r.statusLabel}</Badge>
      </span>
      <span title={`Step ${r.step} of ${CANDIDATE_STEP_COUNT}`} className="flex flex-col gap-1.5">
        <span className="flex gap-[3px]">
          {Array.from({ length: CANDIDATE_STEP_COUNT }).map((_, i) => (
            <span key={i} className={cn("h-[5px] flex-1 rounded-full", i < r.step ? "bg-[var(--color-dot)]" : "bg-[var(--color-track)]")} />
          ))}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          Step {r.step} of {CANDIDATE_STEP_COUNT}
        </span>
      </span>
      <span className="text-[13.5px] text-[var(--color-ink2)]">{r.fit ?? ""}</span>
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-[13.5px] text-[var(--color-ink)]">
          {r.nextStepText ?? ""}
          {r.nextStepDueDate ? (
            <>
              {" · "}
              <span className={r.nextStepUrgent ? "text-[var(--color-warn)]" : "text-[var(--color-ink-subtle)]"}>{formatShortDate(r.nextStepDueDate)}</span>
            </>
          ) : null}
        </span>
        {onExit ? (
          <button
            type="button"
            onClick={() => onExit(r)}
            className="shrink-0 text-xs text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-ink)]"
          >
            Take off search
          </button>
        ) : null}
      </span>
    </div>
  );
}

export function CandidatesTable({
  rows,
  hiddenRows,
  mandateTitle,
  organizationName,
}: {
  mandateId: string;
  rows: CandidateRow[];
  hiddenRows: CandidateRow[];
  mandateTitle: string;
  organizationName: string;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exitRow, setExitRow] = useState<CandidateRow | null>(null);

  return (
    <div className="min-w-[640px]">
      <div className={cn(GRID, "mt-2 h-10 text-xs text-[var(--color-muted)]")}>
        <span>Candidate</span>
        <span>Where they are</span>
        <span>Progress</span>
        <span>Fit</span>
        <span>Next step</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-sm text-[var(--color-muted)]">No candidates on this search yet.</p>
      ) : (
        rows.map((r) => <Row key={r.id} r={r} onOpenDetail={setDetailId} onExit={setExitRow} />)
      )}

      {hiddenRows.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="flex h-[46px] w-full items-center justify-between border-t border-[var(--color-line)] text-[13.5px] text-[var(--color-ink2)]"
          >
            <span>
              {hiddenRows.length} candidate{hiddenRows.length === 1 ? "" : "s"} no longer in the process
            </span>
            <span className="text-[var(--color-muted)]">{showHidden ? "Hide" : "Show"}</span>
          </button>
          {showHidden ? hiddenRows.map((r) => <Row key={r.id} r={r} onOpenDetail={setDetailId} onExit={null} />) : null}
        </>
      ) : null}

      <ProcessDetailDialog
        candidateProcessId={detailId}
        onClose={() => setDetailId(null)}
        onStageChange={() => {
          /* list re-renders from server data on revalidate */
        }}
      />

      <ProcessStageDialog
        open={exitRow !== null}
        candidateFirstName={exitRow?.candidateFirstName}
        context={`${exitRow?.statusLabel ?? ""} · ${mandateTitle}, ${organizationName}`}
        onCancel={() => setExitRow(null)}
        onConfirm={(result: ProcessStageDialogResult) => {
          if (exitRow) changeProcessStageAction({ candidateProcessId: exitRow.id, ...result });
          setExitRow(null);
        }}
      />
    </div>
  );
}
