"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogSignalDialog } from "./log-signal-dialog";

/** Trigger for screen 22 (DlgR4LogSignal) — was a plain Link to /intelligence/new, now opens the pop-up. */
export function LogSignalButton({ organizations, currentUserId }: { organizations: { id: string; name: string }[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-[14px] w-[14px]" /> Log signal
      </Button>
      <LogSignalDialog open={open} onClose={() => setOpen(false)} organizations={organizations} currentUserId={currentUserId} />
    </>
  );
}
