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
import { CURRENCIES } from "@/lib/iso";
import type { MandateFormState } from "./actions";

const PRIORITIES = ["CRITICAL", "HIGH", "NORMAL", "LOW"];
const CONFIDENTIALITIES = ["OPEN", "CONFIDENTIAL", "HIGHLY_CONFIDENTIAL"];
const SENIORITIES = ["BOARD_OR_C_SUITE", "N_MINUS_1", "DIRECTOR_OR_VP", "HEAD_OF", "SENIOR_MANAGER", "MANAGER", "INDIVIDUAL_CONTRIBUTOR", "CONSULTANT_OR_INTERIM", "OTHER"];
const EMPLOYMENT_TYPES = ["PERMANENT", "INTERIM", "FRACTIONAL", "FIXED_TERM", "CONTRACT"];
const WORK_ARRANGEMENTS = ["ON_SITE", "HYBRID", "REMOTE", "FLEXIBLE"];
const ENGAGEMENT_MODELS = ["RETAINED", "EXCLUSIVE_CONTINGENT", "CONTINGENT", "INTERIM", "OTHER"];
const FEE_TYPES = ["PERCENTAGE_OF_BASE", "PERCENTAGE_OF_TOTAL_CASH", "FIXED_FEE", "DAY_RATE_MARGIN", "OTHER"];

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

export function MandateForm({
  action,
  organizations,
  people,
  users,
  currentUserId,
  defaultValues,
  submitLabel = "Create mandate",
  presetOrganizationId,
}: {
  action: (state: MandateFormState, formData: FormData) => Promise<MandateFormState>;
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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Group Finance Director" defaultValue={values.title} required />
        {errors.title ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.title[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hiringOrganizationId">Hiring organisation</Label>
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
        <Label htmlFor="source">Source</Label>
        <Select name="source" defaultValue={values.source ?? ""}>
          <SelectTrigger id="source">
            <SelectValue placeholder="How did this mandate come about?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DIRECT_CLIENT">Direct client</SelectItem>
            <SelectItem value="FUND_INTRODUCTION">Fund introduction</SelectItem>
            <SelectItem value="REPEAT_BUSINESS">Repeat business</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--color-ink-subtle)]">Required for a mandate with no opportunity behind it.</p>
        {errors.source ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.source[0]}</p> : null}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={values.priority ?? "NORMAL"}>
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
          <Label htmlFor="confidentiality">Confidentiality</Label>
          <Select name="confidentiality" defaultValue={values.confidentiality ?? "OPEN"}>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hiringManagerPersonId">Hiring manager</Label>
          <Select name="hiringManagerPersonId" defaultValue={values.hiringManagerPersonId}>
            <SelectTrigger id="hiringManagerPersonId">
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
          <Label htmlFor="internalTalentPersonId">Internal talent / HR contact</Label>
          <Select name="internalTalentPersonId" defaultValue={values.internalTalentPersonId}>
            <SelectTrigger id="internalTalentPersonId">
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seniority">Seniority</Label>
          <Select name="seniority" defaultValue={values.seniority}>
            <SelectTrigger id="seniority">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {SENIORITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select name="employmentType" defaultValue={values.employmentType ?? "PERMANENT"}>
            <SelectTrigger id="employmentType">
              <SelectValue />
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
          <Label htmlFor="numberOfHires">Number of hires</Label>
          <Input id="numberOfHires" name="numberOfHires" type="number" min={1} placeholder="e.g. 1" defaultValue={values.numberOfHires ?? 1} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="e.g. London" defaultValue={values.city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workArrangement">Work arrangement</Label>
          <Select name="workArrangement" defaultValue={values.workArrangement}>
            <SelectTrigger id="workArrangement">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {WORK_ARRANGEMENTS.map((w) => (
                <SelectItem key={w} value={w}>
                  {label(w)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetShortlistDate">Target shortlist date</Label>
          <Input id="targetShortlistDate" name="targetShortlistDate" type="date" defaultValue={values.targetShortlistDate} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="roleSummary">Role summary</Label>
        <Textarea id="roleSummary" name="roleSummary" rows={2} placeholder="e.g. Leading the finance function through a period of rapid growth." defaultValue={values.roleSummary} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessContext">Business context</Label>
        <Textarea id="businessContext" name="businessContext" rows={2} placeholder="e.g. Backed by a PE sponsor, targeting a sale in 3-5 years." defaultValue={values.businessContext} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requiredExperience">Required experience</Label>
        <Textarea id="requiredExperience" name="requiredExperience" rows={2} placeholder="e.g. 10+ years in a PE-backed FD or CFO role." defaultValue={values.requiredExperience} />
      </div>

      <div className="rounded-md border border-[var(--color-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold">Commercial terms</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minBaseAmount">Min base</Label>
            <Input id="minBaseAmount" name="minBaseAmount" type="number" min={0} placeholder="e.g. 90000" defaultValue={values.minBaseAmount} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxBaseAmount">Max base</Label>
            <div className="flex gap-2">
              <Input id="maxBaseAmount" name="maxBaseAmount" type="number" min={0} placeholder="e.g. 120000" defaultValue={values.maxBaseAmount} />
              <Select name="baseCurrency" defaultValue={values.baseCurrency ?? "GBP"}>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="engagementModel">Engagement model</Label>
            <Select name="engagementModel" defaultValue={values.engagementModel ?? "RETAINED"}>
              <SelectTrigger id="engagementModel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {label(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feeType">Fee type</Label>
            <Select name="feeType" defaultValue={values.feeType ?? "PERCENTAGE_OF_BASE"}>
              <SelectTrigger id="feeType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {label(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feePercentage">Fee %</Label>
            <Input id="feePercentage" name="feePercentage" type="number" min={0} max={100} placeholder="e.g. 30" defaultValue={values.feePercentage} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetCompletionDate">Target completion date</Label>
            <Input id="targetCompletionDate" name="targetCompletionDate" type="date" defaultValue={values.targetCompletionDate} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox name="signedTerms" value="true" defaultChecked={values.signedTerms === true || values.signedTerms === "true"} />
          Terms of business signed
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton text={submitLabel} />
      </div>
    </form>
  );
}
