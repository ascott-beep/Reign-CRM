"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Section 9 "More details": secondary fields, closed by default — unless a field inside it already has a validation error to show. */
export function MoreDetails({ children, label = "More details", defaultOpen = false }: { children: React.ReactNode; label?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--color-line)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center gap-1.5 text-left text-[13px] font-medium text-[var(--color-ink2)]"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")} />
        {label}
      </button>
      {open ? <div className="mt-2 flex flex-col gap-3">{children}</div> : null}
    </div>
  );
}
