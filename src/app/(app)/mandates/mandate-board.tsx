"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MANDATE_LIVE_BOARD_COLUMNS, type MandateLiveBoardColumn } from "@/lib/rules";

export type BoardMandate = {
  id: string;
  reference: string;
  title: string;
  column: MandateLiveBoardColumn;
  organizationName: string;
  cardLine: string;
};

function Card({ m }: { m: BoardMandate }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/mandates/${m.id}`)}
      className="box-border flex h-[110px] cursor-default flex-col gap-2.5 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-3 text-[var(--color-ink)]"
    >
      <span className="min-w-0">
        <span className="line-clamp-2 min-h-[38px] text-[14.5px] font-medium leading-tight">{m.title}</span>
        <span className="mt-1 line-clamp-1 text-[13px] leading-tight text-[var(--color-muted)]">{m.organizationName}</span>
      </span>
      <span className="mt-auto border-t border-[var(--color-line)] pt-2.5 text-[13.5px] text-[var(--color-ink2)]">{m.cardLine}</span>
    </div>
  );
}

function Column({ column, items }: { column: MandateLiveBoardColumn; items: BoardMandate[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-sunk)] p-2">
      <div className="flex items-baseline justify-between px-1.5 pb-1 pt-0.5">
        <span className="text-[14px] font-medium">{column}</span>
        <span className="text-[12.5px] text-[var(--color-muted)]">{items.length}</span>
      </div>
      {items.map((m) => (
        <Card key={m.id} m={m} />
      ))}
    </div>
  );
}

/** Round 5 screen 13: a mandate's column is worked out from its furthest candidate (candidate-process-actions.ts keeps the stored status in step), so there's nothing to drag here — Brief is the only one set by having no candidates yet. */
export function MandateBoard({ mandates }: { mandates: BoardMandate[] }) {
  const columns = useMemo(() => {
    const grouped: Record<MandateLiveBoardColumn, BoardMandate[]> = Object.fromEntries(MANDATE_LIVE_BOARD_COLUMNS.map((c) => [c, []])) as unknown as Record<
      MandateLiveBoardColumn,
      BoardMandate[]
    >;
    for (const m of mandates) grouped[m.column]!.push(m);
    return grouped;
  }, [mandates]);

  return (
    <div className="flex flex-1 gap-2 overflow-x-auto" style={{ minHeight: 420 }}>
      {MANDATE_LIVE_BOARD_COLUMNS.map((c) => (
        <Column key={c} column={c} items={columns[c]} />
      ))}
    </div>
  );
}
