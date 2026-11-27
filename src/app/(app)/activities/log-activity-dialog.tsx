"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActivityForm } from "./activity-form";

type LinkContext = {
  organizationId?: string;
  personId?: string;
  opportunityId?: string;
  mandateId?: string;
  candidateProcessId?: string;
  intelligenceItemId?: string;
  label?: string;
};

export function LogActivityDialog({
  users,
  currentUserId,
  linkContext,
  trigger = "Log activity",
  defaultType = "CALL",
}: {
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  linkContext: LinkContext;
  trigger?: string;
  defaultType?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <MessageSquarePlus className="h-4 w-4" /> {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <ActivityForm users={users} currentUserId={currentUserId} linkContext={linkContext} defaultType={defaultType} />
      </DialogContent>
    </Dialog>
  );
}
