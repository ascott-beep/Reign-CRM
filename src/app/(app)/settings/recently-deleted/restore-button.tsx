"use client";

import { useTransition } from "react";
import { ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreRecordAction } from "@/lib/delete-actions";
import type { DeletableType } from "@/lib/delete";

export function RestoreButton({ type, id }: { type: DeletableType; id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => restoreRecordAction(type, id))}
    >
      <ArchiveRestore className="h-3.5 w-3.5" /> {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}
