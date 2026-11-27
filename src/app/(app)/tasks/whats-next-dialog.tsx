"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CornerDownLeft, Phone, Users as MeetingIcon, SquareCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CompletedTaskSummary } from "./actions";
import { logCompletedCallOutcomeAction, createNextStepTaskAction } from "./actions";

const OUTCOME_OPTIONS = [
  { value: "CONNECTED", label: "Connected" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "NO_ANSWER", label: "No answer" },
] as const;

const TYPE_OPTIONS = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "MEETING", label: "Meeting", icon: MeetingIcon },
  { value: "TASK", label: "Task", icon: SquareCheck },
  { value: "EMAIL", label: "Email", icon: Mail },
] as const;

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function timeOnly(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Round 2 section 4 "What's next?" / Round 4 screen 21 (DlgR4Next) — opens whenever any activity/task is ticked done, on a record, on Tasks, or in Home's Today list. */
export function WhatsNextDialog({ task, onClose }: { task: CompletedTaskSummary | null; onClose: () => void }) {
  if (!task) return null;
  // Remounts fresh (and so resets all its form state) whenever a different task is completed.
  return <WhatsNextDialogInner key={task.id} task={task} onClose={onClose} />;
}

function WhatsNextDialogInner({ task, onClose }: { task: CompletedTaskSummary; onClose: () => void }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<(typeof OUTCOME_OPTIONS)[number]["value"]>("CONNECTED");
  const [note, setNote] = useState("");
  const [nextType, setNextType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>(
    TYPE_OPTIONS.some((t) => t.value === task.type) ? (task.type as (typeof TYPE_OPTIONS)[number]["value"]) : "CALL",
  );
  const [nextSubject, setNextSubject] = useState(() => (task.personName ? `Follow up with ${task.personName}` : `Follow up: ${task.title}`));
  const [nextDue, setNextDue] = useState(() => dateOnly(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [nextTime, setNextTime] = useState(() => timeOnly(new Date()));
  const [pending, setPending] = useState(false);

  const isCall = task.type === "CALL";

  async function logOutcomeIfAny() {
    if (!task) return;
    if (isCall) {
      await logCompletedCallOutcomeAction({
        outcome,
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
        type: nextType,
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
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-[18px] w-[18px] text-[var(--color-pos)]" />
            {task.title} done
          </DialogTitle>
          {task.recordLabel ? <DialogDescription>{task.recordLabel}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isCall ? (
            <div className="flex flex-col gap-2">
              <Label>How did it go?</Label>
              <SegmentedToggle options={OUTCOME_OPTIONS} value={outcome} onChange={setOutcome} />
              <Input placeholder="One line on what happened (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-3">
            <Label>Next step</Label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setNextType(t.value)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px]",
                    nextType === t.value
                      ? "border-[var(--color-navy)] bg-[var(--color-chip-strong)] text-[var(--color-chip-strong-ink)]"
                      : "border-[var(--color-line)] text-[var(--color-ink2)]",
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
            <Input id="nextSubject" value={nextSubject} onChange={(e) => setNextSubject(e.target.value)} autoFocus />
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("tomorrow")}>
                Tomorrow
              </Button>
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("in-3-days")}>
                In 3 days
              </Button>
              <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => quickDate("next-week")}>
                Next week
              </Button>
              <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="h-8 w-36 text-xs" aria-label="Pick a date" />
              <Input type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} className="h-8 w-24 text-xs" aria-label="Time" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleNoNextStep} disabled={pending}>
            No next step <span className="ml-1.5 rounded-[4px] bg-[var(--color-chip)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-muted)]">esc</span>
          </Button>
          <Button type="button" onClick={handleSaveNextStep} disabled={pending}>
            {pending ? "Saving…" : "Save next step"} <CornerDownLeft className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
