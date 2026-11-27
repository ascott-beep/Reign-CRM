"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Sparkles, X, Loader2 } from "lucide-react";
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
import { MoneyInput } from "@/components/ui/money-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { label } from "@/lib/labels";
import { COUNTRIES, CURRENCIES } from "@/lib/iso";
import { researchNewOrganizationAction } from "./actions";
import type { OrgFormState } from "./actions";
import type { OrganizationResearchResult } from "@/lib/organization-research";

const ORG_TYPES = ["PE_FUND", "PORTFOLIO_COMPANY", "OTHER_COMPANY", "ADVISER", "LENDER", "OTHER"];
const ORG_STATUSES = ["RESEARCH", "TARGET", "PROSPECT", "ACTIVE_CLIENT", "DORMANT", "DO_NOT_CONTACT", "ARCHIVED"];
const PRIORITIES = ["UNSCORED", "MONITOR", "DEVELOP", "PRIORITY"];
const PORTFOLIO_CLASSIFICATIONS = ["PLATFORM", "ADD_ON", "STANDALONE", "CARVE_OUT", "UNKNOWN"];

function SubmitButton({ name, value, text }: { name: string; value: string; text: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name={name} value={value} disabled={pending}>
      {pending ? "Saving…" : text}
    </Button>
  );
}

function FilledByAi() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-ai-icon)]">
      <Sparkles className="h-3 w-3" /> Filled by AI
    </span>
  );
}

/** Round 4 screen 27 "New organisation, filled by AI": Research button, AI-filled field badges, multi-sector chips, sticky footer. */
export function OrganizationForm({
  action,
  users,
  ownershipTypes,
  sectors,
  defaultValues,
  submitLabel = "Save organisation",
  cancelHref = "/organisations",
}: {
  action: (state: OrgFormState, formData: FormData) => Promise<OrgFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  ownershipTypes: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const [type, setType] = useState<string>(values.type ?? "OTHER_COMPANY");
  const errors = state.errors ?? {};

  const [name, setName] = useState(values.name ?? "");
  const [website, setWebsite] = useState(values.website ?? "");
  const [hqCity, setHqCity] = useState(values.hqCity ?? "");
  const [hqCountryCode, setHqCountryCode] = useState(values.hqCountryCode ?? "");
  const [aumAmount, setAumAmount] = useState(values.aumAmount ?? "");
  const [aumCurrency, setAumCurrency] = useState(values.aumCurrency ?? "GBP");
  const [description, setDescription] = useState(values.description ?? "");
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>(values.sectorIds ?? (values.sectorId ? [values.sectorId] : []));

  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [aiSources, setAiSources] = useState<{ title: string; url: string }[]>([]);
  const [researching, startResearch] = useTransition();
  const [researchError, setResearchError] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function clearAiFill() {
    setAiFilled(new Set());
    setAiSources([]);
  }

  function runResearch() {
    if (!name.trim() || researching) return;
    setResearchError(null);
    startResearch(async () => {
      try {
        const result: OrganizationResearchResult = await researchNewOrganizationAction(name.trim());
        const filled = new Set<string>();
        if (result.fields.website) {
          setWebsite(result.fields.website);
          filled.add("website");
        }
        if (result.fields.hqCity) {
          setHqCity(result.fields.hqCity);
          filled.add("hq");
        }
        if (result.fields.hqCountryCode) {
          setHqCountryCode(result.fields.hqCountryCode);
          filled.add("hq");
        }
        if (result.fields.aumAmount) {
          setAumAmount(String(result.fields.aumAmount));
          filled.add("aum");
        }
        if (result.fields.aumCurrency) setAumCurrency(result.fields.aumCurrency);
        if (result.fields.sectors && result.fields.sectors.length > 0) {
          const matched = sectors.filter((s) => result.fields.sectors!.some((name) => name.toLowerCase() === s.name.toLowerCase()));
          if (matched.length > 0) {
            setSelectedSectorIds(matched.map((s) => s.id));
            filled.add("sectors");
          }
        }
        if (result.fields.about) {
          setDescription(result.fields.about);
          filled.add("about");
        }
        setAiFilled(filled);
        setAiSources(result.sources);
        setDirty(true);
      } catch (e) {
        setResearchError(e instanceof Error ? e.message : "Could not research this company.");
      }
    });
  }

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col gap-4 pb-20">
        <div className="mx-auto w-full max-w-[760px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
          <h2 className="mb-3.5 text-base font-medium">The organisation</h2>

          <div className="mb-4 flex flex-col gap-1.5">
            <Label htmlFor="name">
              Name <span className="font-normal text-[var(--color-ink-subtle)]">(required)</span>
            </Label>
            <div className="flex gap-2">
              <Input id="name" name="name" placeholder="e.g. Bracken Software Solutions" value={name} onChange={(e) => setName(e.target.value)} required />
              <Button
                type="button"
                onClick={runResearch}
                disabled={!name.trim() || researching}
                className="shrink-0 border border-[var(--color-ai-line)] bg-[var(--color-ai-bg)] text-[var(--color-ai-icon)] hover:bg-[var(--color-ai-bg)]"
              >
                {researching ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : <Sparkles className="h-[14px] w-[14px]" />}
                Research
              </Button>
            </div>
            {errors.name ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.name[0]}</p> : null}
          </div>

          {aiFilled.size > 0 ? (
            <div className="mb-4 flex items-center gap-2 rounded-[6px] bg-[var(--color-ai-bg)] px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)]">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-ai-icon)]" />
              <span className="flex-1">
                Atlas found <strong className="font-medium">{name}</strong> on the web and filled {aiFilled.size} field{aiFilled.size === 1 ? "" : "s"}. Check them before saving.
              </span>
              <button type="button" onClick={clearAiFill} className="font-medium text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
                Clear
              </button>
            </div>
          ) : null}
          {researchError ? <p className="mb-4 text-[13px] text-[var(--color-status-danger-ink)]">{researchError}</p> : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website">
                Website {aiFilled.has("website") ? <FilledByAi /> : null}
              </Label>
              <Input id="website" name="website" placeholder="https://…" value={website} onChange={(e) => setWebsite(e.target.value)} />
              {errors.website ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.website[0]}</p> : null}
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hqCity">
                Headquarters {aiFilled.has("hq") ? <FilledByAi /> : null}
              </Label>
              <div className="flex gap-2">
                <Input id="hqCity" name="hqCity" placeholder="City" value={hqCity} onChange={(e) => setHqCity(e.target.value)} className="flex-1" />
                <Select value={hqCountryCode} onValueChange={setHqCountryCode}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="hqCountryCode" value={hqCountryCode} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aumAmount">
                Assets under management {aiFilled.has("aum") ? <FilledByAi /> : null}
              </Label>
              <div className="flex gap-2">
                <Select value={aumCurrency} onValueChange={setAumCurrency}>
                  <SelectTrigger className="w-24 shrink-0">
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
                <input type="hidden" name="aumCurrency" value={aumCurrency} />
                <MoneyInput key={`aum-${aumAmount}`} name="aumAmount" currency={aumCurrency} defaultValue={aumAmount} placeholder="e.g. £500,000,000" className="flex-1" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>
                Sectors {aiFilled.has("sectors") ? <FilledByAi /> : null}
              </Label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5">
                {selectedSectorIds.map((id) => {
                  const sector = sectors.find((s) => s.id === id);
                  if (!sector) return null;
                  return (
                    <span key={id} className="flex h-7 items-center gap-1 rounded-full bg-[var(--color-chip)] px-2.5 text-[12.5px] text-[var(--color-ink)]">
                      {sector.name}
                      <button type="button" onClick={() => setSelectedSectorIds((prev) => prev.filter((s) => s !== id))} aria-label={`Remove ${sector.name}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                <Select onValueChange={(id) => setSelectedSectorIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}>
                  <SelectTrigger className="h-7 w-auto min-w-[120px] border-none bg-transparent px-1 shadow-none">
                    <SelectValue placeholder="Add sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors
                      .filter((s) => !selectedSectorIds.includes(s.id))
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSectorIds.map((id) => (
                <input key={id} type="hidden" name="sectorIds" value={id} />
              ))}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description">
                About {aiFilled.has("about") ? <FilledByAi /> : null}
              </Label>
              <Textarea id="description" name="description" rows={3} placeholder="e.g. A mid-market logistics provider serving UK retailers." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </section>

          <h2 className="mb-3.5 mt-6 border-t border-[var(--color-line)] pt-5 text-base font-medium">Your relationship</h2>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Relationship</Label>
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
              <Label htmlFor="relationshipOwnerId">Owner</Label>
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
          </section>

          <div className="mt-5">
            <MoreDetails subtitle="Source, tags, custom fields">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://linkedin.com/company/…" defaultValue={values.linkedinUrl} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hqRegion">HQ region</Label>
                  <Input id="hqRegion" name="hqRegion" placeholder="e.g. Greater London" defaultValue={values.hqRegion} />
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
                  <Label htmlFor="source">Source</Label>
                  <Input id="source" name="source" placeholder="e.g. Introduced by a portfolio company CFO" defaultValue={values.source} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input id="sourceUrl" name="sourceUrl" placeholder="https://…" defaultValue={values.sourceUrl} />
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
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-card)] px-6 py-3 shadow-[var(--shadow-overlay)] md:left-[228px]">
          <p className="truncate text-[13px] text-[var(--color-ink-subtle)]">
            {aiSources.length > 0 ? (
              <>
                Sources:{" "}
                {aiSources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 ? ", " : ""}
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">
                      {s.title}
                    </a>
                  </span>
                ))}
              </>
            ) : (
              "Type a name and press Research to fill the rest from the web."
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
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
