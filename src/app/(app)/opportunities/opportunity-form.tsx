"use client";

import { useActionState, useState } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreDetails } from "@/components/ui/more-details";
import { label } from "@/lib/labels";
import { CURRENCIES } from "@/lib/iso";
import type { OpportunityFormState } from "./actions";

const TYPES = ["RETAINED_SEARCH", "EXCLUSIVE_CONTINGENT", "CONTINGENT", "INTERIM_ASSIGNMENT", "TALENT_MAPPING", "ADVISORY", "UNKNOWN"];
const SOURCES = [
  "CANDIDATE_INTELLIGENCE",
  "REFERRAL",
  "FUND_INTRODUCTION",
  "CLIENT_INBOUND",
  "OUTBOUND",
  "EXISTING_RELATIONSHIP",
  "WEBSITE_INBOUND",
  "LINKEDIN",
  "EVENT",
  "OTHER",
];
const EMPLOYMENT_TYPES = ["PERMANENT", "INTERIM", "FRACTIONAL", "FIXED_TERM", "CONTRACT"];

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

export function OpportunityForm({
  action,
  organizations,
  people,
  users,
  currentUserId,
  defaultValues,
  submitLabel = "Create opportunity",
  presetOrganizationId,
}: {
  action: (state: OpportunityFormState, formData: FormData) => Promise<OpportunityFormState>;
  organizations: { id: string; name: string }[];
  people: { id: string; firstName: string; lastName: string }[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const errors = state.errors ?? {};
  const [estimatedFeeCurrency, setEstimatedFeeCurrency] = useState(values.estimatedFeeCurrency ?? "GBP");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hiringOrganizationId">Company</Label>
        <Select name="hiringOrganizationId" defaultValue={values.hiringOrganizationId ?? presetOrganizationId} required>
          <SelectTrigger id="hiringOrganizationId">
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
        {errors.hiringOrganizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.hiringOrganizationId[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="potentialRoleTitle">Role</Label>
        <Input id="potentialRoleTitle" name="potentialRoleTitle" placeholder="e.g. Group Finance Director" defaultValue={values.potentialRoleTitle} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estimatedFeeAmount">Estimated fee</Label>
        <div className="flex gap-2">
          <MoneyInput id="estimatedFeeAmount" name="estimatedFeeAmount" currency={estimatedFeeCurrency} placeholder="e.g. £30,000" defaultValue={values.estimatedFeeAmount} />
          <Select name="estimatedFeeCurrency" value={estimatedFeeCurrency} onValueChange={setEstimatedFeeCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MoreDetails defaultOpen={Boolean(errors.name)}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Opportunity name</Label>
          <Input id="name" name="name" placeholder="e.g. Oakfield Professional Services · Group FD" defaultValue={values.name} />
          <p className="text-xs text-[var(--color-ink-subtle)]">Leave blank to use &ldquo;Role · Company&rdquo;.</p>
          {errors.name ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.name[0]}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employmentType">Employment type</Label>
            <Select name="employmentType" defaultValue={values.employmentType}>
              <SelectTrigger id="employmentType">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {label(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Opportunity type</Label>
            <Select name="type" defaultValue={values.type ?? "UNKNOWN"}>
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Select name="source" defaultValue={values.source ?? "OTHER"}>
            <SelectTrigger id="source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leadContactPersonId">Lead contact</Label>
          <Select name="leadContactPersonId" defaultValue={values.leadContactPersonId}>
            <SelectTrigger id="leadContactPersonId">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerId">Owner</Label>
          <Select name="ownerId" defaultValue={values.ownerId ?? currentUserId}>
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expectedDecisionDate">Expected decision date</Label>
          <Input id="expectedDecisionDate" name="expectedDecisionDate" type="date" defaultValue={values.expectedDecisionDate} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nextStepSummary">Next step</Label>
          <Textarea id="nextStepSummary" name="nextStepSummary" rows={2} placeholder="e.g. Awaiting signed terms before kicking off the search." defaultValue={values.nextStepSummary} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="e.g. CFO keen to move quickly; board sign-off expected next week." defaultValue={values.notes} />
        </div>
      </MoreDetails>

      <div className="flex justify-end">
        <SubmitButton text={submitLabel} />
      </div>
    </form>
  );
}
