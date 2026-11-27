"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateMandateDialog } from "./create-mandate-dialog";

export function ConvertToMandateButton({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArrowRightCircle className="h-[14px] w-[14px]" /> Convert to mandate
      </Button>
      <CreateMandateDialog
        open={open}
        opportunityId={opportunityId}
        onClose={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
