"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List as ListIcon, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { MandateBoard, type BoardMandate } from "./mandate-board";
import { MandatesList, type MandateListRow } from "./mandates-list";

export type ClosedMandate = { id: string; title: string; organizationName: string; status: string };

export function MandatesView({
  display,
  liveMandates,
  closedMandates,
  listRows,
}: {
  display: "board" | "list";
  liveMandates: BoardMandate[];
  closedMandates: ClosedMandate[];
  listRows: MandateListRow[];
}) {
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-control border border-[var(--color-line)] bg-[var(--color-card)] p-[3px]">
          <Link
            href="?display=board"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[3px] px-3 text-[13px]",
              display === "board" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Link>
          <Link
            href="?display=list"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[3px] px-3 text-[13px]",
              display === "list" ? "bg-[var(--color-navy)] text-[var(--color-navy-ink)]" : "text-[var(--color-ink2)]",
            )}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </Link>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setClosedOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-4 text-[13px] text-[var(--color-ink)]"
          >
            Closed <span className="text-[var(--color-muted)]">{closedMandates.length}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          </button>
          <Button asChild>
            <Link href="/mandates/new">
              <Plus className="h-[14px] w-[14px]" /> New mandate
            </Link>
          </Button>
        </div>
      </div>

      <div className="-mt-2 flex flex-wrap justify-end gap-[18px] text-[13px] text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-alert)]" /> Next action overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-pos)]" /> Next action due today or later
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-muted)] opacity-55" /> No next action
        </span>
      </div>

      {closedOpen ? (
        <div className="rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)]">
          {closedMandates.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-muted)]">No closed searches.</p>
          ) : (
            closedMandates.map((m, i) => (
              <Link
                key={m.id}
                href={`/mandates/${m.id}`}
                className={cn(
                  "flex min-h-[46px] items-center justify-between gap-3 px-4 py-2 text-[var(--color-ink)] no-underline",
                  i > 0 && "border-t border-[var(--color-line)]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{m.title}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">{m.organizationName}</span>
                </span>
                <StatusBadge value={m.status} />
              </Link>
            ))
          )}
        </div>
      ) : null}

      {display === "board" ? <MandateBoard initialMandates={liveMandates} /> : <MandatesList rows={listRows} />}
    </div>
  );
}
