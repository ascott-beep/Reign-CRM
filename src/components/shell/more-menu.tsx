"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "./delete-dialog";
import type { DeletableType } from "@/lib/delete";

/** The "⋯" More button at the end of a record header's actions — section 9.3, admins only. */
export function MoreMenu({
  type,
  id,
  listHref,
  downloadDataHref,
}: {
  type: DeletableType;
  id: string;
  listHref: string;
  /** Section 10.1 "Download data" — set only on the Person record page. */
  downloadDataHref?: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink)]"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {downloadDataHref ? (
            <DropdownMenuItem asChild>
              <a href={downloadDataHref} download>
                <Download className="h-3.5 w-3.5" /> Download data
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-[var(--color-warn)]">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteOpen ? <DeleteDialog type={type} id={id} listHref={listHref} onClose={() => setDeleteOpen(false)} /> : null}
    </>
  );
}
