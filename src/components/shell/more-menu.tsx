"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "./delete-dialog";
import { DownloadDataDialog } from "@/app/(app)/people/download-data-dialog";
import type { DeletableType } from "@/lib/delete";

/** The "⋯" More button at the end of a record header's actions — section 9.3, admins only. */
export function MoreMenu({
  type,
  id,
  listHref,
  downloadDataFor,
}: {
  type: DeletableType;
  id: string;
  listHref: string;
  /** Round 4 screen 24 (DlgR4Gdpr) "Download data" — set only on the Person record page. */
  downloadDataFor?: { personId: string; personName: string };
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

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
          {downloadDataFor ? (
            <DropdownMenuItem onSelect={() => setDownloadOpen(true)}>
              <Download className="h-3.5 w-3.5" /> Download data
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-[var(--color-warn)]">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteOpen ? <DeleteDialog type={type} id={id} listHref={listHref} onClose={() => setDeleteOpen(false)} /> : null}
      {downloadDataFor ? (
        <DownloadDataDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} personId={downloadDataFor.personId} personName={downloadDataFor.personName} />
      ) : null}
    </>
  );
}
