"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { cn, formatMoney } from "@/lib/utils";
import { label } from "@/lib/labels";
import { CURRENCIES } from "@/lib/iso";
import { CHANCE_OF_WINNING, EDITABLE_STAGES } from "@/lib/validation/opportunity";
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

/** Round 4 screen 28 "New opportunity": 760px card, live "Client · Role" name suggestion, stage chips, chance-of-winning band, a required first next step, and a live Likely fee panel. */
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
  people: { id: string; firstName: string; lastName: string }[];
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
  const [role, setRole] = useState(values.potentialRoleTitle ?? "");
  const [name, setName] = useState(values.name ?? (orgName && role ? `${orgName} · ${role}` : ""));
  const [nameEdited, setNameEdited] = useState(Boolean(values.name));
  const [estimatedFeeCurrency, setEstimatedFeeCurrency] = useState(values.estimatedFeeCurrency ?? "GBP");
  const [estimatedFeeAmount, setEstimatedFeeAmount] = useState<string>(values.estimatedFeeAmount ? String(values.estimatedFeeAmount) : "");
  const [stage, setStage] = useState(values.stage ?? "SIGNAL_IDENTIFIED");
  const [chanceOfWinning, setChanceOfWinning] = useState<keyof typeof CHANCE_OF_WINNING>(values.chanceOfWinning ?? "MEDIUM");
  const [nextStepTitle, setNextStepTitle] = useState(values.firstNextStepTitle ?? "");
  const [nextStepDate, setNextStepDate] = useState(values.firstNextStepDueDate ?? "");
  const [pickingDate, setPickingDate] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const suggestedName = orgName && role ? `${orgName} · ${role}` : orgName || role;
  const displayedName = nameEdited ? name : suggestedName;

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

  const likelyFee = (Number(estimatedFeeAmount) || 0) * (CHANCE_OF_WINNING[chanceOfWinning] / 100);

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="mx-auto w-full max-w-[760px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
          <h2 className="mb-3.5 text-base font-medium">The opportunity</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Name <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={displayedName}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              required

            />
            {errors.name ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.name[0]}</p> : null}
          </div>

          <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hiringOrganizationId">
                Client <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
              </Label>
              <OrganisationCombobox
                name="hiringOrganizationId"
                defaultId={values.hiringOrganizationId ?? presetOrganizationId}
                defaultName={presetOrganizationName}
                onNameChange={setOrgName}
                placeholder="Start typing to find or add one"
              />
              {errors.hiringOrganizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.hiringOrganizationId[0]}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="potentialRoleTitle">Role</Label>
              <Input
                id="potentialRoleTitle"
                name="potentialRoleTitle"

                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leadContactPersonId">Client contact</Label>
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
              <Label htmlFor="portfolioCompanyId">Portfolio company</Label>
              <OrganisationCombobox
                name="portfolioCompanyId"
                defaultId={values.portfolioCompanyId ?? presetPortfolioCompanyId}
                defaultName={presetPortfolioCompanyName}
                placeholder="If different from the client"
              />
            </div>
          </section>

          <h2 className="mb-3.5 mt-6 border-t border-[var(--color-line)] pt-5 text-base font-medium">Stage and value</h2>
          <div className="flex flex-col gap-1.5">
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
            {isEdit ? <p className="text-xs text-[var(--color-ink-subtle)]">Change the stage from the progress bar on the record.</p> : null}
            <input type="hidden" name="stage" value={stage} />
          </div>

          <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <MoneyInput
                  id="estimatedFeeAmount"
                  name="estimatedFeeAmount"
                  currency={estimatedFeeCurrency}

                  defaultValue={estimatedFeeAmount}
                  onValueChange={setEstimatedFeeAmount}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedDecisionDate">Expected close</Label>
              <Input id="expectedDecisionDate" name="expectedDecisionDate" type="date" defaultValue={values.expectedDecisionDate} />
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
              {isEdit ? <p className="text-xs text-[var(--color-ink-subtle)]">Set once when the opportunity is created.</p> : null}
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
          </section>

          {!isEdit ? (
            <>
              <h2 className="mb-1 mt-6 border-t border-[var(--color-line)] pt-5 text-base font-medium">First next step</h2>
              <div className="flex gap-2">
                <Input
                  name="firstNextStepTitle"

                  value={nextStepTitle}
                  onChange={(e) => setNextStepTitle(e.target.value)}
                  required
                  className="flex-1"
                />
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
              <p className="mt-1.5 text-xs text-[var(--color-ink-subtle)]">Every open opportunity has one next step. It shows on Tasks and on the pipeline card.</p>
              {errors.firstNextStepTitle ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.firstNextStepTitle[0]}</p> : null}
            </>
          ) : null}

          <div className="mt-5">
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

        <div className="mx-auto w-full max-w-[300px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-card)] p-5 lg:sticky lg:top-4">
          <p className="text-sm text-[var(--color-ink-subtle)]">Likely fee</p>
          <p className="mt-1 text-[28px] font-light tracking-[-0.01em] text-[var(--color-ink)]">{formatMoney(likelyFee, estimatedFeeCurrency) || "£0"}</p>
          <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
            Estimated fee {formatMoney(estimatedFeeAmount || 0, estimatedFeeCurrency)} × {CHANCE_OF_WINNING[chanceOfWinning]}% chance. Adds to Likely fees on Overview.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-[760px] items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => (dirty ? setConfirmDiscard(true) : router.push(cancelHref))}>
            Cancel
          </Button>
          <SubmitButton text={submitLabel} />
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
