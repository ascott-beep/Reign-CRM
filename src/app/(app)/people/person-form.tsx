"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreDetails } from "@/components/ui/more-details";
import { OrganisationCombobox } from "@/components/ui/organisation-combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
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

function SubmitButton({ name, value, text }: { name: string; value: string; text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name={name} value={value} disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

/** Round 4 screen 26 "New person": one card, duplicate check as you type, organisation combobox with "Add new", type chips, sticky footer. */
export function PersonForm({
  action,
  users,
  defaultValues,
  submitLabel = "Save person",
  presetOrganizationId,
  presetOrganizationName,
  cancelHref = "/people",
}: {
  action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
  presetOrganizationName?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    Array.isArray(values.personTypes) ? values.personTypes : values.personTypes ? [values.personTypes] : ["CLIENT_CONTACT"],
  );
  const errors = state.errors ?? {};

  const [firstName, setFirstName] = useState(values.firstName ?? "");
  const [lastName, setLastName] = useState(values.lastName ?? "");
  const [email, setEmail] = useState(values.primaryEmail ?? "");
  const [dupMatch, setDupMatch] = useState<{ id: string; name: string; orgName: string | null } | null>(null);
  const [dupDismissed, setDupDismissed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((!firstName && !lastName) || dupDismissed) {
        setDupMatch(null);
        return;
      }
      const params = new URLSearchParams({ firstName, lastName, email });
      fetch(`/api/people/duplicate-check?${params.toString()}`)
        .then((r) => r.json())
        .then((d: { match: { id: string; name: string; orgName: string | null } | null }) => setDupMatch(d.match))
        .catch(() => setDupMatch(null));
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, email, dupDismissed]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && dirty) {
        e.preventDefault();
        setConfirmDiscard(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty]);

  function toggleType(type: string) {
    setDirty(true);
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col gap-4 pb-20">
        <div className="mx-auto w-full max-w-[760px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
          <h2 className="mb-3.5 text-base font-medium">About them</h2>

          {dupMatch && !dupDismissed ? (
            <div className="mb-4 flex items-center gap-2.5 rounded-[6px] bg-[var(--color-ai-bg)] px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
              <span className="flex-1">
                <strong className="font-medium">{dupMatch.name}</strong>
                {dupMatch.orgName ? ` at ${dupMatch.orgName}` : ""} may be the same person.
              </span>
              <a href={`/people/${dupMatch.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                Open record
              </a>
              <button type="button" onClick={() => setDupDismissed(true)} className="font-medium text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
                Not the same
              </button>
            </div>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">
                First name <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="e.g. Jamie"
                defaultValue={values.firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              {errors.firstName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.firstName[0]}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">
                Last name <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="e.g. Okafor"
                defaultValue={values.lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              {errors.lastName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.lastName[0]}</p> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="headlineOverride">Job title</Label>
              <Input id="headlineOverride" name="headlineOverride" placeholder="e.g. Operating Partner" defaultValue={values.headlineOverride} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentOrganizationOverrideId">Organisation</Label>
              <OrganisationCombobox
                name="currentOrganizationOverrideId"
                defaultId={values.currentOrganizationOverrideId ?? presetOrganizationId}
                defaultName={presetOrganizationName}
                placeholder="Start typing to find or add one"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {PERSON_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={cn(
                      "flex h-7 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                      selectedTypes.includes(t)
                        ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]"
                        : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-active)]",
                    )}
                  >
                    {label(t)}
                  </button>
                ))}
              </div>
              {selectedTypes.map((t) => (
                <input key={t} type="hidden" name="personTypes" value={t} />
              ))}
              {errors.personTypes ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.personTypes[0]}</p> : null}
            </div>
          </section>

          <h2 className="mb-3.5 mt-6 border-t border-[var(--color-line)] pt-5 text-base font-medium">How to reach them</h2>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primaryEmail">Email</Label>
              <Input
                id="primaryEmail"
                name="primaryEmail"
                type="email"
                placeholder="name@company.com"
                defaultValue={values.primaryEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.primaryEmail ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.primaryEmail[0]}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primaryPhone">Phone</Label>
              <Input id="primaryPhone" name="primaryPhone" placeholder="+44 20 7946 0000" defaultValue={values.primaryPhone} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input id="linkedinUrl" name="linkedinUrl" placeholder="linkedin.com/in/" defaultValue={values.linkedinUrl} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Location</Label>
              <Input id="city" name="city" placeholder="London" defaultValue={values.city} />
            </div>
          </section>

          <div className="mt-5">
            <MoreDetails subtitle="Source, tags, custom fields">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="region">Region</Label>
                  <Input id="region" name="region" placeholder="e.g. Greater London" defaultValue={values.region} />
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source">Source</Label>
                  <Input id="source" name="source" placeholder="e.g. Met at an industry conference" defaultValue={values.source} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input id="sourceUrl" name="sourceUrl" placeholder="https://…" defaultValue={values.sourceUrl} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="summary">Notes</Label>
                <Textarea id="summary" name="summary" rows={3} placeholder="e.g. Experienced CFO looking for a new challenge in PE-backed businesses." defaultValue={values.summary} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="doNotContact" value="true" defaultChecked={values.doNotContact === "true" || values.doNotContact === true} />
                  Do not contact
                </label>
                <Input name="doNotContactReason" placeholder="Reason (if applicable)" defaultValue={values.doNotContactReason} />
              </div>

              {!defaultValues ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="createCandidateProfile" value="true" />
                  Also create a candidate profile for this person
                </label>
              ) : null}
            </MoreDetails>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-card)] px-6 py-3 shadow-[var(--shadow-overlay)] md:left-[228px]">
          <p className="text-[13px] text-[var(--color-ink-subtle)]">Only the name is needed. Add the rest now or later.</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => (dirty ? setConfirmDiscard(true) : router.push(cancelHref))}>
              Cancel
            </Button>
            {!defaultValues ? <SubmitButton name="intent" value="another" text="Save and add another" /> : null}
            <SubmitButton name="intent" value="single" text={submitLabel} />
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard your changes?"
        description="What you've entered on this form will be lost."
        confirmLabel="Discard changes"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => router.push(cancelHref)}
      />
    </>
  );
}
