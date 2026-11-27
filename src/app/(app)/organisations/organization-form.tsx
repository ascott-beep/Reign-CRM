"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreDetails } from "@/components/ui/more-details";
import { label } from "@/lib/labels";
import { COUNTRIES, CURRENCIES } from "@/lib/iso";
import type { OrgFormState } from "./actions";

const ORG_TYPES = ["PE_FUND", "PORTFOLIO_COMPANY", "OTHER_COMPANY", "ADVISER", "LENDER", "OTHER"];
const ORG_STATUSES = ["RESEARCH", "TARGET", "PROSPECT", "ACTIVE_CLIENT", "DORMANT", "DO_NOT_CONTACT", "ARCHIVED"];
const PRIORITIES = ["UNSCORED", "MONITOR", "DEVELOP", "PRIORITY"];
const PORTFOLIO_CLASSIFICATIONS = ["PLATFORM", "ADD_ON", "STANDALONE", "CARVE_OUT", "UNKNOWN"];

function SubmitButton({ label: text }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

export function OrganizationForm({
  action,
  users,
  ownershipTypes,
  sectors,
  defaultValues,
  submitLabel = "Create organisation",
}: {
  action: (state: OrgFormState, formData: FormData) => Promise<OrgFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  ownershipTypes: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const [type, setType] = useState<string>(values.type ?? "OTHER_COMPANY");
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="rounded-md border border-[var(--color-status-warning-ink)] bg-[var(--color-status-warning-bg)] p-4 text-sm text-[var(--color-status-warning-ink)]">
          <p className="font-medium">Possible duplicate organisations found:</p>
          <ul className="mt-2 list-disc pl-5">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                {d.name} — {d.reason}
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" name="confirmNotDuplicate" value="true" />
            This is a distinct organisation — create it anyway
          </label>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Organisation name</Label>
          <Input id="name" name="name" placeholder="e.g. Bracken Software Solutions" defaultValue={values.name} required />
          {errors.name ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.name[0]}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {label(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="type" value={type} />
        </div>

        <div className="sm:col-span-2">
          <MoreDetails>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={values.status ?? "RESEARCH"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="https://…" defaultValue={values.website} />
                {errors.website ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.website[0]}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://linkedin.com/company/…" defaultValue={values.linkedinUrl} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hqCity">HQ City</Label>
                <Input id="hqCity" name="hqCity" placeholder="e.g. London" defaultValue={values.hqCity} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hqRegion">HQ Region</Label>
                <Input id="hqRegion" name="hqRegion" placeholder="e.g. Greater London" defaultValue={values.hqRegion} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hqCountryCode">HQ Country</Label>
                <Select name="hqCountryCode" defaultValue={values.hqCountryCode}>
                  <SelectTrigger id="hqCountryCode">
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
                <Label htmlFor="employeeCountMin">Employees (min)</Label>
                <Input id="employeeCountMin" name="employeeCountMin" type="number" min={0} placeholder="e.g. 50" defaultValue={values.employeeCountMin} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="employeeCountMax">Employees (max)</Label>
                <Input id="employeeCountMax" name="employeeCountMax" type="number" min={0} placeholder="e.g. 200" defaultValue={values.employeeCountMax} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownershipTypeId">Ownership</Label>
                <Select name="ownershipTypeId" defaultValue={values.ownershipTypeId}>
                  <SelectTrigger id="ownershipTypeId">
                    <SelectValue placeholder="Select ownership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownershipTypes.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sectorId">Sector</Label>
                <Select name="sectorId" defaultValue={values.sectorId}>
                  <SelectTrigger id="sectorId">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountPriority">Account priority</Label>
                <Select name="accountPriority" defaultValue={values.accountPriority ?? "UNSCORED"}>
                  <SelectTrigger id="accountPriority">
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
                <Input id="source" name="source" placeholder="e.g. Introduced by a portfolio company CFO" defaultValue={values.source} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input id="sourceUrl" name="sourceUrl" placeholder="https://…" defaultValue={values.sourceUrl} />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} placeholder="e.g. A mid-market logistics provider serving UK retailers." defaultValue={values.description} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="internalSummary">Internal summary</Label>
                <Textarea id="internalSummary" name="internalSummary" rows={3} placeholder="e.g. Strong management team; worth a follow-up call next quarter." defaultValue={values.internalSummary} />
              </div>
            </div>

            {type === "PE_FUND" ? (
              <div className="rounded-md border border-[var(--color-border)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Fund details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fundVintageOrCurrentFundName">Current fund name / vintage</Label>
                    <Input id="fundVintageOrCurrentFundName" name="fundVintageOrCurrentFundName" placeholder="e.g. Fund III (2021)" defaultValue={values.fundVintageOrCurrentFundName} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="aumAmount">AUM</Label>
                    <div className="flex gap-2">
                      <Input id="aumAmount" name="aumAmount" type="number" min={0} placeholder="e.g. 500000000" defaultValue={values.aumAmount} />
                      <Select name="aumCurrency" defaultValue={values.aumCurrency ?? "GBP"}>
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
                </div>
              </div>
            ) : null}

            {type === "PORTFOLIO_COMPANY" ? (
              <div className="rounded-md border border-[var(--color-border)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Portfolio company details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="portfolioClassification">Classification</Label>
                    <Select name="portfolioClassification" defaultValue={values.portfolioClassification ?? undefined}>
                      <SelectTrigger id="portfolioClassification">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        {PORTFOLIO_CLASSIFICATIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {label(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="businessModelSummary">Business model summary</Label>
                    <Textarea id="businessModelSummary" name="businessModelSummary" rows={2} placeholder="e.g. B2B SaaS, subscription-based" defaultValue={values.businessModelSummary} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="investmentThesisSummary">Investment thesis summary</Label>
                    <Textarea id="investmentThesisSummary" name="investmentThesisSummary" rows={2} placeholder="e.g. Consolidation play in a fragmented market" defaultValue={values.investmentThesisSummary} />
                  </div>
                </div>
              </div>
            ) : null}
          </MoreDetails>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
