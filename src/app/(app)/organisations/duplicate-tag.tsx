"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MergeOrganizationDialog } from "./merge-dialog";

export function OrganizationDuplicateTag({ organizationId, survivorId, survivorName }: { organizationId: string; survivorId: string; survivorName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        <Badge tone="warning">Duplicate · merge</Badge>
      </button>
      {open ? <MergeOrganizationDialog survivorId={survivorId} duplicateId={organizationId} duplicateName={survivorName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
