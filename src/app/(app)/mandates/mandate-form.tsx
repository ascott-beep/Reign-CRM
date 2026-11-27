"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
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

/** Round 4 screen 29 "Edit mandate": locked Client field once there's a source opportunity, More details open by default, tags, and a footer that counts unsaved changes. */
export function MandateForm({
  action,
  people,
  users,
  allTags = [],
  currentUserId,
  defaultValues,
  submitLabel = "Create mandate",
  presetOrganizationId,
  presetOrganizationName,
  lockedClientReason,
  cancelHref = "/mandates",
}: {
  action: (state: MandateFormState, formData: FormData) => Promise<MandateFormState>;
  people: { id: string; firstName: string; lastName: string }[];
  users: { id: string; firstName: string; lastName: string }[];
  allTags?: { id: string; name: string }[];
  currentUserId: string;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
  presetOrganizationName?: string;
  /** e.g. "Set when the opportunity was won" -- when present, the Client field shows locked instead of editable. */
  lockedClientReason?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef<string | null>(null);
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const [baseCurrency, setBaseCurrency] = useState(values.baseCurrency ?? "GBP");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(Array.isArray(values.tagIds) ? values.tagIds : []);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const errors = state.errors ?? {};
  const isEdit = Boolean(defaultValues);

  const hasAdvancedErrors = Boolean(errors.source);

  function snapshot(): string {
    if (!formRef.current) return "";
    const fd = new FormData(formRef.current);
    const entries = Array.from(fd.entries()).filter(([k]) => k !== "tagIds");
    entries.push(...selectedTagIds.map((id) => ["tagIds", id] as [string, string]));
    return JSON.stringify(entries.sort());
  }

  function recomputeUnsaved() {
    if (baselineRef.current === null) return;
    const before = JSON.parse(baselineRef.current) as [string, string][];
    const after = JSON.parse(snapshot()) as [string, string][];
    const beforeSet = new Set(before.map((e) => e.join("=")));
    const afterSet = new Set(after.map((e) => e.join("=")));
    let changed = 0;
    for (const e of afterSet) if (!beforeSet.has(e)) changed++;
    for (const e of beforeSet) if (!afterSet.has(e)) changed++;
    setUnsavedCount(changed > 0 ? changed : 0);
  }

  useEffect(() => {
    // A tick after mount, so every Select/Checkbox has finished writing its own
    // hidden input before this becomes the "unsaved changes" baseline.
    const handle = setTimeout(() => {
      baselineRef.current = snapshot();
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recomputeUnsaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && unsavedCount > 0) {
        e.preventDefault();
        setConfirmDiscard(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unsavedCount]);

  const availableTags = allTags.filter((t) => !selectedTagIds.includes(t.id));

  return (
    <>
    <form ref={formRef} action={formAction} onChange={recomputeUnsaved} className="flex flex-col gap-4 pb-20">
      <div className="mx-auto w-full max-w-[760px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
      <h2 className="mb-3.5 text-base font-medium">The search</h2>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hiringOrganizationId">
          Client {!lockedClientReason ? <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span> : null}
        </Label>
        {lockedClientReason ? (
          <>
            <div className="flex h-10 items-center justify-between rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-sunk)] px-3 text-sm text-[var(--color-ink-subtle)]">
              {presetOrganizationName}
              <Lock className="h-[14px] w-[14px] shrink-0" />
            </div>
            <input type="hidden" name="hiringOrganizationId" value={presetOrganizationId} />
            <p className="text-xs text-[var(--color-ink-subtle)]">{lockedClientReason}</p>
          </>
        ) : (
          <OrganisationCombobox name="hiringOrganizationId" defaultId={values.hiringOrganizationId ?? presetOrganizationId} defaultName={presetOrganizationName} />
        )}
        {errors.hiringOrganizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.hiringOrganizationId[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">
          Role <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
        </Label>
        <Input id="title" name="title" placeholder="e.g. Group Finance Director" defaultValue={values.title} required />
        {errors.title ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.title[0]}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feePercentage">Fee %</Label>
        <Input id="feePercentage" name="feePercentage" type="number" min={0} max={100} placeholder="e.g. 30" defaultValue={values.feePercentage} />
      </div>
      </section>

      <div className="mt-5">
      <MoreDetails defaultOpen={isEdit || hasAdvancedErrors} subtitle="Source, retainer split, tags, confidentiality">
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

        <div className="flex flex-col gap-1.5">
          <Label>Tags</Label>
          <div className="relative flex flex-wrap items-center gap-1.5 rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5">
            {selectedTagIds.map((id) => {
              const tag = allTags.find((t) => t.id === id);
              if (!tag) return null;
              return (
                <span key={id} className="flex h-7 items-center gap-1 rounded-full bg-[var(--color-chip)] px-2.5 text-[12.5px] text-[var(--color-ink)]">
                  {tag.name}
                  <button type="button" onClick={() => setSelectedTagIds((prev) => prev.filter((t) => t !== id))} aria-label={`Remove ${tag.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {selectedTagIds.map((id) => (
              <input key={id} type="hidden" name="tagIds" value={id} />
            ))}
            <button
              type="button"
              onClick={() => setTagPickerOpen((v) => !v)}
              className="flex h-7 items-center px-1 text-[13px] text-[var(--color-ink-subtle)]"
            >
              Add tag
            </button>
            {tagPickerOpen && availableTags.length > 0 ? (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-[6px] border border-[var(--color-line)] bg-[var(--color-card)] shadow-[var(--shadow-overlay)]">
                {availableTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagIds((prev) => [...prev, t.id]);
                      setTagPickerOpen(false);
                    }}
                    className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--color-active)]"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
              <MoneyInput id="minBaseAmount" name="minBaseAmount" currency={baseCurrency} placeholder="e.g. £90,000" defaultValue={values.minBaseAmount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxBaseAmount">Max base</Label>
              <div className="flex gap-2">
                <MoneyInput id="maxBaseAmount" name="maxBaseAmount" currency={baseCurrency} placeholder="e.g. £120,000" defaultValue={values.maxBaseAmount} />
                <Select name="baseCurrency" value={baseCurrency} onValueChange={setBaseCurrency}>
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
              <Label htmlFor="targetCompletionDate">Target completion date</Label>
              <Input id="targetCompletionDate" name="targetCompletionDate" type="date" defaultValue={values.targetCompletionDate} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox name="signedTerms" value="true" defaultChecked={values.signedTerms === true || values.signedTerms === "true"} />
            Terms of business signed
          </label>
        </div>
      </MoreDetails>
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-card)] px-6 py-3 shadow-[var(--shadow-overlay)] md:left-[228px]">
        {isEdit ? (
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-subtle)]">
            {unsavedCount > 0 ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warn)]" /> {unsavedCount} unsaved change{unsavedCount === 1 ? "" : "s"}
              </>
            ) : (
              "Changes are saved to the audit log."
            )}
          </p>
        ) : (
          <p className="text-[13px] text-[var(--color-ink-subtle)]">Role and client are required.</p>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => (unsavedCount > 0 ? setConfirmDiscard(true) : router.push(cancelHref))}>
            Cancel
          </Button>
          <SubmitButton text={submitLabel} />
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
