"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CompletedTaskSummary } from "./actions";
import { logCompletedCallOutcomeAction, createNextStepTaskAction } from "./actions";

const OUTCOME_OPTIONS = [
  { value: "CONNECTED", label: "Connected" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "NO_ANSWER", label: "No answer" },
] as const;

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Round 2 section 4 "What's next?" — opens whenever any activity/task is ticked done, on a record, on Tasks, or in Home's Today list. */
export function WhatsNextDialog({ task, onClose }: { task: CompletedTaskSummary | null; onClose: () => void }) {
  if (!task) return null;
  // Remounts fresh (and so resets all its form state) whenever a different task is completed.
  return <WhatsNextDialogInner key={task.id} task={task} onClose={onClose} />;
}

function WhatsNextDialogInner({ task, onClose }: { task: CompletedTaskSummary; onClose: () => void }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [nextSubject, setNextSubject] = useState(() => (task.personName ? `Follow up with ${task.personName}` : `Follow up: ${task.title}`));
  const [nextDue, setNextDue] = useState(() => dateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [pending, setPending] = useState(false);

  const isCall = task.type === "CALL";

  async function logOutcomeIfAny() {
    if (!task) return;
    if (isCall && (outcome || note)) {
      await logCompletedCallOutcomeAction({
        outcome: (outcome as "CONNECTED" | "VOICEMAIL" | "NO_ANSWER") || undefined,
        note: note || undefined,
        personId: task.personId,
        assignedUserId: task.assignedUserId,
        opportunityId: task.opportunityId,
        mandateId: task.mandateId,
        candidateProcessId: task.candidateProcessId,
        intelligenceItemId: task.intelligenceItemId,
      });
    }
  }

  async function handleSaveNextStep() {
    if (!task) return;
    setPending(true);
    try {
      await logOutcomeIfAny();
      await createNextStepTaskAction({
        title: nextSubject || "Follow up",
        type: task.type,
        dueDate: nextDue,
        personId: task.personId,
        assignedUserId: task.assignedUserId,
        opportunityId: task.opportunityId,
        mandateId: task.mandateId,
        candidateProcessId: task.candidateProcessId,
        intelligenceItemId: task.intelligenceItemId,
      });
      router.refresh();
      onClose();
    } finally {
      setPending(false);
    }
  }

  async function handleNoNextStep() {
    setPending(true);
    try {
      await logOutcomeIfAny();
      router.refresh();
      onClose();
    } finally {
      setPending(false);
    }
  }

  function quickDate(choice: "tomorrow" | "in-3-days" | "next-week") {
    const d = new Date();
    if (choice === "tomorrow") d.setDate(d.getDate() + 1);
    if (choice === "in-3-days") d.setDate(d.getDate() + 3);
    if (choice === "next-week") d.setDate(d.getDate() + 7);
    setNextDue(dateOnly(d));
  }

  return (
    <Dialog
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-md"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !pending) {
            e.preventDefault();
            handleSaveNextStep();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            handleNoNextStep();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>✓ {task.title} done</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isCall ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="One-line note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-3">
            <Label htmlFor="nextSubject">Next activity</Label>
            <Input id="nextSubject" value={nextSubject} onChange={(e) => setNextSubject(e.target.value)} autoFocus />
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("tomorrow")}>
                Tomorrow
              </Button>
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("in-3-days")}>
                In 3 days
              </Button>
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("next-week")}>
                Next week
              </Button>
              <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="h-8 w-40 text-xs" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleNoNextStep} disabled={pending}>
            No next step <span className="ml-1.5 text-xs opacity-60">Esc</span>
          </Button>
          <Button type="button" onClick={handleSaveNextStep} disabled={pending}>
            {pending ? "Saving…" : "Save next step"} <span className="ml-1.5 text-xs opacity-70">Enter</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
