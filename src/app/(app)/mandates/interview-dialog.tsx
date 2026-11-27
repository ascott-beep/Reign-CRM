"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { scheduleInterviewAction } from "./candidate-process-actions";

const TYPES = ["RECRUITER_SCREEN", "CLIENT_INTERVIEW", "CASE_STUDY", "PRESENTATION", "ASSESSMENT", "INFORMAL_MEETING", "OTHER"];

export function InterviewDialog({ candidateProcessId, onScheduled }: { candidateProcessId: string; onScheduled?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await scheduleInterviewAction(formData);
      setOpen(false);
      onScheduled?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule interview.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Schedule interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="candidateProcessId" value={candidateProcessId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="CLIENT_INTERVIEW">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {label(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roundNumber">Round</Label>
              <Input id="roundNumber" name="roundNumber" type="number" min={1} defaultValue={1} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledStart">Date &amp; time</Label>
            <Input id="scheduledStart" name="scheduledStart" type="datetime-local" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="locationOrLink">Location / link</Label>
            <Input id="locationOrLink" name="locationOrLink" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preparationNotes">Preparation notes</Label>
            <Textarea id="preparationNotes" name="preparationNotes" rows={2} />
          </div>
          {error ? <p className="text-sm text-[var(--color-status-danger-ink)]">{error}</p> : null}
          <DialogFooter>
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
