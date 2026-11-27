"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Download, Pencil, Tag, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/shell/toast-provider";
import { label } from "@/lib/labels";
import { renameDocumentAction, changeDocumentCategoryAction, deleteDocumentAction } from "./actions";

const CATEGORIES = ["CV", "JOB_DESCRIPTION", "TERMS", "PROPOSAL", "INTERVIEW_NOTES", "OTHER"];

/** Round 4 screen 16 (R4MandateDocuments): Download, Rename, Change type, Delete. */
export function DocumentRowMenu({ documentId, displayName }: { documentId: string; displayName: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [category, setCategory] = useState("OTHER");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Document actions" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-active)]">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/documents/${documentId}/download`}>
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTypeOpen(true)}>
            <Tag className="h-3.5 w-3.5" /> Change type
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-[var(--color-warn)]">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-doc">Name</Label>
            <Input id="rename-doc" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await renameDocumentAction(documentId, name);
                  setRenameOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change document type</DialogTitle>
          </DialogHeader>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {label(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setTypeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await changeDocumentCategoryAction(documentId, category);
                  setTypeOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${displayName}?`}
        description="This removes the file from every record it's linked to. This can't be undone."
        confirmLabel="Delete document"
        pending={pending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteDocumentAction(documentId);
            setDeleteOpen(false);
            showToast({ kind: "success", title: "Document deleted", body: displayName });
            router.refresh();
          })
        }
      />
    </>
  );
}
