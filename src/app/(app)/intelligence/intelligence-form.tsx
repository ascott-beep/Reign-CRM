"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { label } from "@/lib/labels";
import { createIntelligenceAction } from "./actions";

const TYPES = [
  "LEADERSHIP_CHANGE",
  "POTENTIAL_VACANCY",
  "ACTIVE_VACANCY",
  "ACQUISITION",
  "INTEGRATION",
  "CARVE_OUT",
  "TRANSFORMATION",
  "INTERNATIONAL_EXPANSION",
  "EXIT_PREPARATION",
  "REFINANCING",
  "FINANCE_TEAM_WEAKNESS",
  "FAILED_SEARCH",
  "AGENCY_DISSATISFACTION",
  "CANDIDATE_MOVEMENT",
  "OTHER",
];
const CONFIDENCES = ["UNVERIFIED", "PARTIALLY_VERIFIED", "VERIFIED"];
const RELEVANCES = ["NONE", "LOW", "MEDIUM", "HIGH", "IMMEDIATE"];
const CONFIDENTIALITIES = ["INTERNAL", "RESTRICTED"];

export function IntelligenceForm({
  organizations,
  people,
  users,
  currentUserId,
  presetOrganizationId,
}: {
  organizations: { id: string; name: string }[];
  people: { id: string; firstName: string; lastName: string }[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  presetOrganizationId?: string;
}) {
  const [state, formAction] = useActionState(createIntelligenceAction, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
        {errors.title ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.title[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organizationId">Organisation</Label>
        <Select name="organizationId" defaultValue={presetOrganizationId} required>
          <SelectTrigger id="organizationId">
            <SelectValue placeholder="Select organisation" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.organizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.organizationId[0]}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue="OTHER">
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
          <Label htmlFor="dateReceived">Date received</Label>
          <Input id="dateReceived" name="dateReceived" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details">Details</Label>
        <Textarea id="details" name="details" rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sourcePersonId">Source person</Label>
        <Select name="sourcePersonId">
          <SelectTrigger id="sourcePersonId">
            <SelectValue placeholder="Select person" />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confidence">Confidence</Label>
          <Select name="confidence" defaultValue="UNVERIFIED">
            <SelectTrigger id="confidence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONFIDENCES.map((c) => (
                <SelectItem key={c} value={c}>
                  {label(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commercialRelevance">Commercial relevance</Label>
          <Select name="commercialRelevance" defaultValue="NONE">
            <SelectTrigger id="commercialRelevance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELEVANCES.map((r) => (
                <SelectItem key={r} value={r}>
                  {label(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confidentiality">Confidentiality</Label>
          <Select name="confidentiality" defaultValue="INTERNAL">
            <SelectTrigger id="confidentiality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONFIDENTIALITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {label(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ownerId">Owner</Label>
        <Select name="ownerId" defaultValue={currentUserId}>
          <SelectTrigger id="ownerId">
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

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="followUpRequired" value="true" />
        Follow-up required
      </label>

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
      {pending ? "Saving…" : "Create intelligence item"}
    </Button>
  );
}
