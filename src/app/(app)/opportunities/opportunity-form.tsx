"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { MoreDetails } from "@/components/ui/more-details";
import { OrganisationCombobox } from "@/components/ui/organisation-combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PillSelect } from "@/components/ui/pill-select";
import { RolePicker } from "@/components/ui/role-picker";
import { FormPageHeader } from "@/components/ui/form-page-header";
import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { label } from "@/lib/labels";
import { CURRENCIES, COUNTRIES } from "@/lib/iso";
import { CHANCE_OF_WINNING, EDITABLE_STAGES } from "@/lib/validation/opportunity";
import { PRACTICES, PRACTICE_LABEL, type Practice } from "@/lib/practices";
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

function quickDateOptions(): { label: string; value: string }[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return [
    { label: "Today", value: iso(today) },
    { label: "Tomorrow", value: iso(tomorrow) },
    { label: "Next week", value: iso(nextWeek) },
  ];
}

/** Round 5 screen 06 "New opportunity": sticky header, Practice then Role, auto-generated read-only Name, stage chips, estimated fee -- no separate live Likely fee preview panel. */
export function OpportunityForm({
  action,
  people,
  users,
  currentUserId,
  defaultValues,
  submitLabel = "Create opportunity",
  presetOrganizationId,
  presetOrganizationName,
  presetPortfolioCompanyId,
  presetPortfolioCompanyName,
  cancelHref = "/opportunities",
}: {
  action: (state: OpportunityFormState, formData: FormData) => Promise<OpportunityFormState>;
  people: { id: string; firstName: string; lastName: string; roleAtFirmLabel?: string | null }[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
  presetOrganizationName?: string;
  /** The portfolio company the role sits at, when distinct from the Client -- optional. */
  presetPortfolioCompanyId?: string;
  presetPortfolioCompanyName?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const errors = state.errors ?? {};
  const isEdit = Boolean(defaultValues);

  const [orgName, setOrgName] = useState(presetOrganizationName ?? "");
  const [portfolioCompanyName, setPortfolioCompanyName] = useState(presetPortfolioCompanyName ?? "");
  const [practiceKey, setPracticeKey] = useState<string>(values.practiceAreaId ?? "");
  const [role, setRole] = useState(values.potentialRoleTitle ?? "");
  const [leadContactPersonId, setLeadContactPersonId] = useState(values.leadContactPersonId ?? "");
  const [countryCode, setCountryCode] = useState(values.countryCode ?? "");
  const [estimatedFeeCurrency, setEstimatedFeeCurrency] = useState(values.estimatedFeeCurrency ?? "GBP");
  const [estimatedFeeAmount, setEstimatedFeeAmount] = useState<string>(values.estimatedFeeAmount ? String(values.estimatedFeeAmount) : "");
  const [stage, setStage] = useState(values.stage ?? "SIGNAL_IDENTIFIED");
  const [chanceOfWinning, setChanceOfWinning] = useState<keyof typeof CHANCE_OF_WINNING>(values.chanceOfWinning ?? "MEDIUM");
  const [ownerId, setOwnerId] = useState(values.ownerId ?? currentUserId);
  const [nextStepTitle, setNextStepTitle] = useState(values.firstNextStepTitle ?? "");
  const [nextStepDate, setNextStepDate] = useState(values.firstNextStepDueDate ?? "");
  const [pickingDate, setPickingDate] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const companyForName = portfolioCompanyName || orgName;
  const generatedName = companyForName && role ? `${companyForName} · ${role}` : companyForName || role;

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

  function onCancel() {
    if (dirty) setConfirmDiscard(true);
    else router.push(cancelHref);
  }

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col">
        <FormPageHeader section="Opportunities" title={isEdit ? "Edit opportunity" : "New opportunity"} submitLabel={isEdit ? "Save changes" : submitLabel} onCancel={onCancel} />

        <div className="mx-auto w-full max-w-[960px]">
          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 py-6">
            <h2 className="pt-2 text-[15px] font-medium">The search</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hiringOrganizationId">Client</Label>
                <OrganisationCombobox
                  name="hiringOrganizationId"
                  defaultId={values.hiringOrganizationId ?? presetOrganizationId}
                  defaultName={presetOrganizationName}
                  onNameChange={setOrgName}
                />
                {errors.hiringOrganizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.hiringOrganizationId[0]}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portfolioCompanyId">Portfolio company</Label>
                <OrganisationCombobox
                  name="portfolioCompanyId"
                  defaultId={values.portfolioCompanyId ?? presetPortfolioCompanyId}
                  defaultName={presetPortfolioCompanyName}
                  onNameChange={setPortfolioCompanyName}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Practice</Label>
                <PillSelect options={PRACTICES.map((p) => ({ value: p, label: PRACTICE_LABEL[p] }))} value={practiceKey ? [practiceKey] : []} onChange={(v) => setPracticeKey(v[0] ?? "")} multi={false} />
                <input type="hidden" name="practiceAreaId" value={practiceKey} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="potentialRoleTitle">Role</Label>
                <RolePicker practices={practiceKey ? [practiceKey as Practice] : []} value={role} onChange={setRole} name="potentialRoleTitle" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leadContactPersonId">Client contact</Label>
                <Select value={leadContactPersonId} onValueChange={setLeadContactPersonId}>
                  <SelectTrigger id="leadContactPersonId">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.roleAtFirmLabel ? ` · ${p.roleAtFirmLabel}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="leadContactPersonId" value={leadContactPersonId} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="countryCode">Location</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
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

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={generatedName} disabled className="text-[var(--color-ink-subtle)]" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
            <h2 className="pt-2 text-[15px] font-medium">Stage and value</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {EDITABLE_STAGES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isEdit}
                      onClick={() => {
                        setStage(s);
                        setDirty(true);
                      }}
                      className={cn(
                        "flex h-7 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                        stage === s
                          ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-navy-ink)]"
                          : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-active)]",
                        isEdit && "cursor-not-allowed opacity-60 hover:bg-[var(--color-surface)]",
                      )}
                    >
                      {label(s)}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="stage" value={stage} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedFeeAmount">Estimated fee</Label>
                <div className="flex gap-2">
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
                  <MoneyInput id="estimatedFeeAmount" name="estimatedFeeAmount" currency={estimatedFeeCurrency} defaultValue={estimatedFeeAmount} onValueChange={setEstimatedFeeAmount} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="chanceOfWinning">Chance of winning</Label>
                <Select name="chanceOfWinning" value={chanceOfWinning} onValueChange={(v) => setChanceOfWinning(v as keyof typeof CHANCE_OF_WINNING)} disabled={isEdit}>
                  <SelectTrigger id="chanceOfWinning">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low · {CHANCE_OF_WINNING.LOW}%</SelectItem>
                    <SelectItem value="MEDIUM">Medium · {CHANCE_OF_WINNING.MEDIUM}%</SelectItem>
                    <SelectItem value="HIGH">High · {CHANCE_OF_WINNING.HIGH}%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expectedDecisionDate">Expected close</Label>
                <Input id="expectedDecisionDate" name="expectedDecisionDate" type="date" defaultValue={values.expectedDecisionDate} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownerId">Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
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
                <input type="hidden" name="ownerId" value={ownerId} />
              </div>

              {!isEdit ? (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="firstNextStepTitle">Next step</Label>
                  <div className="flex gap-2">
                    <Input name="firstNextStepTitle" value={nextStepTitle} onChange={(e) => setNextStepTitle(e.target.value)} required className="flex-1" />
                    <div className="relative">
                      <Button type="button" variant="secondary" onClick={() => setPickingDate((v) => !v)}>
                        <CalendarClock className="h-[14px] w-[14px]" /> {nextStepDate || "Pick a date"}
                      </Button>
                      {pickingDate ? (
                        <div className="absolute right-0 z-20 mt-1 flex w-56 flex-col gap-1 rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] p-1.5 shadow-[var(--shadow-overlay)]">
                          {quickDateOptions().map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => {
                                setNextStepDate(o.value);
                                setPickingDate(false);
                              }}
                              className="rounded-[4px] px-2.5 py-1.5 text-left text-sm hover:bg-[var(--color-active)]"
                            >
                              {o.label}
                            </button>
                          ))}
                          <Input type="date" value={nextStepDate} onChange={(e) => setNextStepDate(e.target.value)} className="mt-1" />
                        </div>
                      ) : null}
                    </div>
                    <input type="hidden" name="firstNextStepDueDate" value={nextStepDate} />
                  </div>
                  {errors.firstNextStepTitle ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.firstNextStepTitle[0]}</p> : null}
                </div>
              ) : null}
            </div>
          </section>

          <div className="border-t border-[var(--color-line)] py-6">
            <MoreDetails subtitle="Source, tags, custom fields">
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
                <Label htmlFor="nextStepSummary">Notes on next step</Label>
                <Textarea id="nextStepSummary" name="nextStepSummary" rows={2} defaultValue={values.nextStepSummary} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes} />
              </div>
            </MoreDetails>
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
