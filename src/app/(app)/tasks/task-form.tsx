"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { createTaskAction, type TaskFormState } from "./actions";

const TYPES = ["CALL", "EMAIL", "LINKEDIN", "RESEARCH", "FOLLOW_UP", "MEETING", "INTERVIEW", "ADMIN", "OTHER"];
const PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"];

export function TaskForm({
  users,
  currentUserId,
  linkContext,
  linkLabel,
}: {
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  linkContext: {
    organizationId?: string;
    personId?: string;
    opportunityId?: string;
    mandateId?: string;
    candidateProcessId?: string;
    intelligenceItemId?: string;
  };
  linkLabel?: string;
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(createTaskAction, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {linkContext.organizationId ? <input type="hidden" name="organizationId" value={linkContext.organizationId} /> : null}
      {linkContext.personId ? <input type="hidden" name="personId" value={linkContext.personId} /> : null}
      {linkContext.opportunityId ? <input type="hidden" name="opportunityId" value={linkContext.opportunityId} /> : null}
      {linkContext.mandateId ? <input type="hidden" name="mandateId" value={linkContext.mandateId} /> : null}
      {linkContext.candidateProcessId ? <input type="hidden" name="candidateProcessId" value={linkContext.candidateProcessId} /> : null}
      {linkContext.intelligenceItemId ? <input type="hidden" name="intelligenceItemId" value={linkContext.intelligenceItemId} /> : null}

      {linkLabel ? (
        <p className="rounded-md bg-[var(--color-status-info-bg)] px-3 py-2 text-sm text-[var(--color-status-info-ink)]">Linked to: {linkLabel}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
        {errors.title ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.title[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue="FOLLOW_UP">
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
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="NORMAL">
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {label(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assignedUserId">Assigned to</Label>
        <Select name="assignedUserId" defaultValue={currentUserId}>
          <SelectTrigger id="assignedUserId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create task"}
    </Button>
  );
}
