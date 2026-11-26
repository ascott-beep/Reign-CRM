"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MergePersonDialog } from "./merge-dialog";

export function PersonDuplicateTag({ personId, survivorId, survivorName }: { personId: string; survivorId: string; survivorName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        <Badge tone="warning">Duplicate · merge</Badge>
      </button>
      {open ? <MergePersonDialog survivorId={survivorId} duplicateId={personId} duplicateName={survivorName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
