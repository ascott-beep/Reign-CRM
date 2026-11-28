"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List as ListIcon, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkSegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeskPicker, type DeskOption } from "@/components/shell/desk-picker";
import { PracticeFilter } from "@/components/ui/practice-filter";
import type { Practice } from "@/lib/practices";
import { cn } from "@/lib/utils";
import { MandateBoard, type BoardMandate } from "./mandate-board";
import { MandatesList, type MandateListRow } from "./mandates-list";

export type ClosedMandate = { id: string; title: string; organizationName: string; status: string };

export function MandatesView({
  display,
  liveMandates,
  closedMandates,
  listRows,
  deskOptions,
  deskValue,
  practiceFilter,
}: {
  display: "board" | "list";
  liveMandates: BoardMandate[];
  closedMandates: ClosedMandate[];
  listRows: MandateListRow[];
  deskOptions: DeskOption[];
  deskValue: string;
  practiceFilter: Practice | undefined;
}) {
  const [closedOpen, setClosedOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div data-toolbar className="flex flex-wrap items-center justify-between gap-3">
        <LinkSegmentedToggle
          name="Board or list"
          value={display}
          options={[
            { value: "board", label: "Board", icon: LayoutGrid, href: "?display=board" },
            { value: "list", label: "List", icon: ListIcon, href: "?display=list" },
          ]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setClosedOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-[14px] text-[13px] text-[var(--color-ink)]"
          >
            Closed <span className="text-[var(--color-muted)]">{closedMandates.length}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          </button>
          <DeskPicker options={deskOptions} initialValue={deskValue} />
          <PracticeFilter value={practiceFilter} />
          <Button asChild>
            <Link href="/mandates/new">
              <Plus className="h-[14px] w-[14px]" /> New mandate
            </Link>
          </Button>
        </div>
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

      {display === "board" ? <MandateBoard mandates={liveMandates} /> : <MandatesList rows={listRows} />}
    </div>
  );
}
