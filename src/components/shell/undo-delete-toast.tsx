"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restoreRecordAction } from "@/lib/delete-actions";
import type { DeletableType } from "@/lib/delete";

/** Shown for 8 seconds after a delete, reading `?deleted=<id>` off the list URL — section 9.3. */
export function UndoDeleteToast({ type }: { type: DeletableType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deletedId = searchParams.get("deleted");
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!deletedId) return;
    const timer = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedId]);

  function dismiss() {
    setDismissedId(deletedId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deleted");
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  if (!deletedId || deletedId === dismissedId) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-navy)] px-5 py-3 text-[var(--color-navy-ink)] shadow-[var(--shadow-overlay)]">
      <span className="text-[13.5px]">Deleted.</span>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await restoreRecordAction(type, deletedId);
            dismiss();
          })
        }
      >
        {pending ? "Restoring…" : "Undo"}
      </Button>
    </div>
  );
}
