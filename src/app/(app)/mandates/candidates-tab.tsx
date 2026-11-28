"use client";

import { useState } from "react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { CandidateBoard, type BoardCandidate } from "./candidate-board";
import { CandidatesTable, type CandidateRow } from "./candidates-table";

/** Round 5 screen 09: Board is the default view, List stays for sorting and bulk actions. */
export function CandidatesTab({
  mandateId,
  mandateTitle,
  organizationName,
  boardCandidates,
  rows,
  hiddenRows,
}: {
  mandateId: string;
  mandateTitle: string;
  organizationName: string;
  boardCandidates: BoardCandidate[];
  rows: CandidateRow[];
  hiddenRows: CandidateRow[];
}) {
  const [display, setDisplay] = useState<"board" | "list">("board");
  const total = boardCandidates.length;
  const furthestCount = rows.length > 0 ? rows[0]!.statusLabel : null;

  return (
    <section className="min-w-0 flex-[3_1_600px] rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] px-6 pb-1.5 pt-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle
          name="Board or list"
          value={display}
          onChange={setDisplay}
          options={[
            { value: "board", label: "Board" },
            { value: "list", label: "List" },
          ]}
        />
        <span className="text-[13px] text-[var(--color-muted)]">
          {total} candidate{total === 1 ? "" : "s"}
          {furthestCount ? ` · 1 ${furthestCount.toLowerCase()}` : ""}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        {display === "board" ? (
          <CandidateBoard candidates={boardCandidates} />
        ) : (
          <CandidatesTable mandateId={mandateId} rows={rows} hiddenRows={hiddenRows} mandateTitle={mandateTitle} organizationName={organizationName} />
        )}
      </div>
    </section>
  );
}
