"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { mergePersonAction } from "./actions";

export function MergeButton({ survivorId, duplicateId, duplicateName }: { survivorId: string; duplicateId: string; duplicateName: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        Merge {duplicateName} into this record
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-ink-subtle)]">Merge and archive {duplicateName}?</span>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => startTransition(() => mergePersonAction(survivorId, duplicateId))}>
        {pending ? "Merging…" : "Confirm merge"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
