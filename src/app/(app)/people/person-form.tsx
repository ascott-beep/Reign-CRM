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
import { COUNTRIES } from "@/lib/iso";
import type { PersonFormState } from "./actions";

const PERSON_TYPES = ["CANDIDATE", "CLIENT_CONTACT", "INVESTOR", "OPERATING_PARTNER", "TALENT_OR_HR", "REFERRER", "ADVISER", "OTHER"];
const RELATIONSHIP_STATUSES = [
  "RESEARCH_ONLY",
  "OUTREACH_PLANNED",
  "CONTACTED",
  "ENGAGED",
  "ACTIVE_RELATIONSHIP",
  "DORMANT",
  "DO_NOT_CONTACT",
  "ARCHIVED",
];

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

export function PersonForm({
  action,
  users,
  organizations,
  defaultValues,
  submitLabel = "Create person",
  presetOrganizationId,
}: {
  action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  organizations: { id: string; name: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    Array.isArray(values.personTypes) ? values.personTypes : values.personTypes ? [values.personTypes] : [],
  );
  const errors = state.errors ?? {};

  function toggleType(type: string) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="rounded-md border border-[var(--color-status-warning-ink)] bg-[var(--color-status-warning-bg)] p-4 text-sm text-[var(--color-status-warning-ink)]">
          <p className="font-medium">Possible duplicate people found:</p>
          <ul className="mt-2 list-disc pl-5">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                {d.firstName} {d.lastName} — {d.reason}
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" name="confirmNotDuplicate" value="true" />
            This is a distinct person — create it anyway
          </label>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={values.firstName} required />
          {errors.firstName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.firstName[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={values.lastName} required />
          {errors.lastName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.lastName[0]}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Person types</Label>
          <div className="flex flex-wrap gap-3">
            {PERSON_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  name="personTypes"
                  value={t}
                  checked={selectedTypes.includes(t)}
                  onCheckedChange={() => toggleType(t)}
                />
                {label(t)}
              </label>
            ))}
          </div>
          {errors.personTypes ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.personTypes[0]}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="primaryEmail">Primary email</Label>
          <Input id="primaryEmail" name="primaryEmail" type="email" defaultValue={values.primaryEmail} />
          {errors.primaryEmail ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.primaryEmail[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="primaryPhone">Primary phone</Label>
          <Input id="primaryPhone" name="primaryPhone" defaultValue={values.primaryPhone} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input id="linkedinUrl" name="linkedinUrl" defaultValue={values.linkedinUrl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="headlineOverride">Headline / current title</Label>
          <Input id="headlineOverride" name="headlineOverride" placeholder="e.g. CFO, Acme Ltd" defaultValue={values.headlineOverride} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={values.city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="countryCode">Country</Label>
          <Select name="countryCode" defaultValue={values.countryCode}>
            <SelectTrigger id="countryCode">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relationshipStatus">Relationship status</Label>
          <Select name="relationshipStatus" defaultValue={values.relationshipStatus ?? "RESEARCH_ONLY"}>
            <SelectTrigger id="relationshipStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relationshipOwnerId">Relationship owner</Label>
          <Select name="relationshipOwnerId" defaultValue={values.relationshipOwnerId}>
            <SelectTrigger id="relationshipOwnerId">
              <SelectValue placeholder="Unassigned" />
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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="currentOrganizationOverrideId">Current organisation</Label>
          <Select name="currentOrganizationOverrideId" defaultValue={values.currentOrganizationOverrideId ?? presetOrganizationId}>
            <SelectTrigger id="currentOrganizationOverrideId">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" defaultValue={values.source} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input id="sourceUrl" name="sourceUrl" defaultValue={values.sourceUrl} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" name="summary" rows={3} defaultValue={values.summary} />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="doNotContact" value="true" defaultChecked={values.doNotContact === "true" || values.doNotContact === true} />
            Do not contact
          </label>
          <Input name="doNotContactReason" placeholder="Reason (if applicable)" defaultValue={values.doNotContactReason} />
        </div>

        {!defaultValues ? (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox name="createCandidateProfile" value="true" />
            Also create a candidate profile for this person
          </label>
        ) : null}
      </section>

      <div className="flex justify-end gap-2">
        <SubmitButton text={submitLabel} />
      </div>
    </form>
  );
}
