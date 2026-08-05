"use client";

import { useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { togglePersonPracticeAreaAction } from "./actions";

export function PracticeAreaPicker({
  personId,
  allPracticeAreas,
  selectedIds,
  readOnly,
}: {
  personId: string;
  allPracticeAreas: { id: string; name: string; colorHex: string | null }[];
  selectedIds: string[];
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {allPracticeAreas.map((pa) => {
        const selected = selectedIds.includes(pa.id);
        const color = pa.colorHex ?? "#8a8a94";
        if (readOnly && !selected) return null;
        return (
          <button
            key={pa.id}
            type="button"
            disabled={readOnly || pending}
            onClick={() => startTransition(() => togglePersonPracticeAreaAction(personId, pa.id))}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
              readOnly ? "cursor-default" : "cursor-pointer hover:opacity-80",
              pending ? "opacity-50" : "",
            )}
            style={
              selected
                ? { borderColor: "transparent", backgroundColor: color, color: "#101B2D" }
                : { borderColor: "var(--color-border-strong)", color: "var(--color-ink-subtle)" }
            }
          >
            {selected ? <Check className="h-3 w-3" /> : readOnly ? null : <Plus className="h-3 w-3" />}
            {pa.name}
          </button>
        );
      })}
    </div>
  );
}
