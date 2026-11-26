"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { createActivityAction, type ActivityFormState } from "./actions";

const TYPES = ["CALL", "EMAIL", "MEETING", "LINKEDIN_MESSAGE", "WHATSAPP", "NOTE", "INTERVIEW", "INTERNAL_UPDATE", "SYSTEM_EVENT", "OTHER"];
const DIRECTIONS = ["INBOUND", "OUTBOUND", "INTERNAL", "NOT_APPLICABLE"];
const OUTCOMES = [
  "CONNECTED",
  "NO_ANSWER",
  "VOICEMAIL",
  "REPLIED",
  "NO_REPLY",
  "MEETING_BOOKED",
  "FOLLOW_UP_REQUIRED",
  "NOT_INTERESTED",
  "DO_NOT_CONTACT",
  "COMPLETED",
  "OTHER",
];

function nowLocalDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ActivityForm({
  users,
  currentUserId,
  linkContext,
  defaultType = "CALL",
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
    label?: string;
  };
  defaultType?: string;
}) {
  const [state, formAction] = useActionState<ActivityFormState, FormData>(createActivityAction, {});
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const errors = state.errors ?? {};
  const hasLink = Boolean(
    linkContext.organizationId || linkContext.personId || linkContext.opportunityId || linkContext.mandateId || linkContext.candidateProcessId || linkContext.intelligenceItemId,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {linkContext.organizationId ? <input type="hidden" name="organizationId" value={linkContext.organizationId} /> : null}
      {linkContext.personId ? <input type="hidden" name="personId" value={linkContext.personId} /> : null}
      {linkContext.opportunityId ? <input type="hidden" name="opportunityId" value={linkContext.opportunityId} /> : null}
      {linkContext.mandateId ? <input type="hidden" name="mandateId" value={linkContext.mandateId} /> : null}
      {linkContext.candidateProcessId ? <input type="hidden" name="candidateProcessId" value={linkContext.candidateProcessId} /> : null}
      {linkContext.intelligenceItemId ? <input type="hidden" name="intelligenceItemId" value={linkContext.intelligenceItemId} /> : null}

      {hasLink ? (
        <p className="rounded-md bg-[var(--color-status-info-bg)] px-3 py-2 text-sm text-[var(--color-status-info-ink)]">
          Linked to: {linkContext.label}
        </p>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isInternal" value="true" />
          Internal-only update (not linked to a specific record)
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={defaultType}>
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
          <Label htmlFor="direction">Direction</Label>
          <Select name="direction" defaultValue="OUTBOUND">
            <SelectTrigger id="direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {label(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" />
        {errors.subject ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.subject[0]}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="occurredAt">Occurred at</Label>
          <Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={nowLocalDatetime()} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={0} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="outcome">Outcome</Label>
        <Select name="outcome">
          <SelectTrigger id="outcome">
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((o) => (
              <SelectItem key={o} value={o}>
                {label(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assignedOwnerId">Owner</Label>
        <Select name="assignedOwnerId" defaultValue={currentUserId}>
          <SelectTrigger id="assignedOwnerId">
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

      <div className="rounded-md border border-[var(--color-border)] p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox name="followUpRequired" value="true" checked={followUpRequired} onCheckedChange={(v) => setFollowUpRequired(v === true)} />
          Follow-up required
        </label>
        {followUpRequired ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followUpTitle">Follow-up task title</Label>
              <Input id="followUpTitle" name="followUpTitle" placeholder="e.g. Chase for feedback" />
              {errors.followUpTitle ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.followUpTitle[0]}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followUpDueDate">Due date</Label>
              <Input id="followUpDueDate" name="followUpDueDate" type="date" />
            </div>
          </div>
        ) : null}
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
      {pending ? "Saving…" : "Log activity"}
    </Button>
  );
}
