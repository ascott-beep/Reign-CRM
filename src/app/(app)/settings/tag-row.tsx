"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { renameTagAction, mergeTagAction, deleteTagAction } from "./actions";

type Tag = { id: string; name: string; count: number };

/** Round 4 screen 39 (R4SetLists) — click a tag chip to rename, merge or delete it. */
export function TagRow({ tag, otherTags }: { tag: Tag; otherTags: Tag[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [mergeInto, setMergeInto] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-chip)] px-3 py-1 text-[13px] text-[var(--color-ink)] hover:border-[var(--color-border-strong)]"
      >
        {tag.name}
        <span className="text-[var(--color-muted)]">{tag.count}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tag.name}</DialogTitle>
          </DialogHeader>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tagName">Name</Label>
            <Input id="tagName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {otherTags.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mergeInto">Merge into</Label>
              <Select value={mergeInto} onValueChange={setMergeInto}>
                <SelectTrigger id="mergeInto">
                  <SelectValue placeholder="Choose a tag" />
                </SelectTrigger>
                <SelectContent>
                  {otherTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Moves every record tagged {tag.name} onto the tag you choose, then removes {tag.name}.
              </p>
            </div>
          ) : null}
          <DialogFooter className="items-center">
            <Button
              type="button"
              variant="secondary"
              className="mr-auto text-[var(--color-status-danger-ink)]"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await deleteTagAction(tag.id);
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not delete this tag.");
                  }
                })
              }
            >
              Delete tag
            </Button>
            {mergeInto ? (
              <Button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    try {
                      await mergeTagAction(tag.id, mergeInto);
                      setOpen(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not merge this tag.");
                    }
                  })
                }
              >
                Merge into {otherTags.find((t) => t.id === mergeInto)?.name}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending || name.trim() === tag.name}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    try {
                      await renameTagAction(tag.id, name);
                      setOpen(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not rename this tag.");
                    }
                  })
                }
              >
                Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
