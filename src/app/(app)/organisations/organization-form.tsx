"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PillSelect } from "@/components/ui/pill-select";
import { TagBox } from "@/components/ui/tag-box";
import { OrganisationCombobox } from "@/components/ui/organisation-combobox";
import { FormPageHeader } from "@/components/ui/form-page-header";
import { label } from "@/lib/labels";
import { COUNTRIES } from "@/lib/iso";
import { PRACTICES, PRACTICE_LABEL } from "@/lib/practices";
import { researchNewOrganizationAction } from "./actions";
import type { OrgFormState } from "./actions";
import type { OrganizationResearchResult } from "@/lib/organization-research";

const WHAT_IS_IT = [
  { value: "PE_FUND", label: "Private equity fund" },
  { value: "PORTFOLIO_COMPANY", label: "Portfolio company" },
  { value: "OTHER_COMPANY", label: "Other company" },
] as const;

const REGIONS = [
  { value: "UNITED_KINGDOM", label: "United Kingdom" },
  { value: "DACH", label: "DACH" },
  { value: "BENELUX", label: "Benelux" },
  { value: "NORDICS", label: "Nordics" },
  { value: "MIDDLE_EAST", label: "Middle East" },
];
const DEAL_TYPES = ["PRIMARY_BUYOUT", "SECONDARY_BUYOUT", "CARVE_OUT", "GROWTH_INVESTMENT", "TAKE_PRIVATE", "BUY_AND_BUILD_ADD_ON"];
const OWNERSHIP_LEVELS = ["MAJORITY", "MINORITY", "CO_CONTROL"];
const ORG_STATUSES = ["RESEARCH", "TARGET", "PROSPECT", "ACTIVE_CLIENT", "DORMANT", "DO_NOT_CONTACT", "ARCHIVED"];
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
const VINTAGE_YEARS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() + 1 - i));

function FilledByAi() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-ai-icon)]">
      <Sparkles className="h-3 w-3" /> Filled by AI
    </span>
  );
}

export function OrganizationForm({
  action,
  users,
  sectors,
  investorStrategies = [],
  defaultValues,
  submitLabel,
  cancelHref = "/organisations",
}: {
  action: (state: OrgFormState, formData: FormData) => Promise<OrgFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  ownershipTypes?: { id: string; name: string }[];
  sectors: { id: string; name: string }[];
  investorStrategies?: { id: string; name: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const errors = state.errors ?? {};
  const isEdit = Boolean(defaultValues);

  const [type, setType] = useState<string>(values.type ?? "PE_FUND");
  const [name, setName] = useState(values.name ?? "");
  const [website, setWebsite] = useState(values.website ?? "");
  const [hqCity, setHqCity] = useState(values.hqCity ?? "");
  const [hqCountryCode, setHqCountryCode] = useState(values.hqCountryCode ?? "");
  const [offices, setOffices] = useState<string[]>(values.countriesOfOperation ?? []);
  const [sectorIds, setSectorIds] = useState<string[]>(values.sectorIds ?? []);

  const [strategyIds, setStrategyIds] = useState<string[]>(values.investorStrategyIds ?? []);
  const [aumAmount, setAumAmount] = useState(values.aumAmount ?? "");
  const [aumCurrency, setAumCurrency] = useState(values.aumCurrency ?? "GBP");
  const [minChequeAmount] = useState(values.typicalMinEquityChequeAmount ?? "");
  const [minChequeCurrency, setMinChequeCurrency] = useState(values.typicalMinEquityChequeCurrency ?? "GBP");
  const [maxChequeAmount] = useState(values.typicalMaxEquityChequeAmount ?? "");
  const [maxChequeCurrency, setMaxChequeCurrency] = useState(values.typicalMaxEquityChequeCurrency ?? "GBP");
  const [currentFundName, setCurrentFundName] = useState(values.currentFundName ?? "");
  const [fundSizeAmount] = useState(values.fundSizeAmount ?? "");
  const [fundSizeCurrency, setFundSizeCurrency] = useState(values.fundSizeCurrency ?? "GBP");
  const [vintageYear, setVintageYear] = useState(values.fundVintageYear ?? "");
  const [regions, setRegions] = useState<string[]>(values.investmentRegions ?? []);
  const [hiringPracticeKeys, setHiringPracticeKeys] = useState<string[]>(values.hiringPracticeAreaIds ?? []);

  const [ownedByOrganizationId] = useState(values.ownedByOrganizationId ?? "");
  const [ownedByOrganizationName, setOwnedByOrganizationName] = useState(values.ownedByOrganizationName ?? "");
  const [fundVehicleName, setFundVehicleName] = useState(values.fundVehicleName ?? "");
  const [dealType, setDealType] = useState(values.dealType ?? "");
  const [ownershipLevel, setOwnershipLevel] = useState(values.ownershipLevel ?? "");
  const [investedDate, setInvestedDate] = useState(values.investedDate ?? "");
  const [likelyExitWindow, setLikelyExitWindow] = useState(values.likelyExitWindow ?? "");
  const [coInvestorIds, setCoInvestorIds] = useState<string[]>(values.coInvestorOrganizationIds ?? []);
  const [revenueAmount] = useState(values.revenueAmount ?? "");
  const [revenueCurrency, setRevenueCurrency] = useState(values.revenueCurrency ?? "GBP");
  const [ebitdaAmount] = useState(values.ebitdaAmount ?? "");
  const [ebitdaCurrency, setEbitdaCurrency] = useState(values.ebitdaCurrency ?? "GBP");
  const [employeeMin, setEmployeeMin] = useState(values.employeeCountMin ?? "");
  const [employeeMax, setEmployeeMax] = useState(values.employeeCountMax ?? "");

  const [status, setStatus] = useState(values.status ?? "RESEARCH");
  const [relationshipOwnerId, setRelationshipOwnerId] = useState(values.relationshipOwnerId ?? "");
  const [notes, setNotes] = useState(values.internalSummary ?? "");

  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [researching, startResearch] = useTransition();
  const [researchError, setResearchError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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
          const matched = sectors.filter((s) => result.fields.sectors!.some((n) => n.toLowerCase() === s.name.toLowerCase()));
          if (matched.length > 0) {
            setSectorIds(matched.map((s) => s.id));
            filled.add("sectors");
          }
        }
        setAiFilled(filled);
        setDirty(true);
      } catch (e) {
        setResearchError(e instanceof Error ? e.message : "Could not research this company.");
      }
    });
  }

  function onCancel() {
    if (dirty) setConfirmDiscard(true);
    else router.push(cancelHref);
  }

  const submitText = submitLabel ?? (isEdit ? "Save organisation" : type === "PE_FUND" ? "Save fund" : type === "PORTFOLIO_COMPANY" ? "Save portfolio company" : "Save organisation");

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col">
        <FormPageHeader section="Organisations" title={isEdit ? `Edit ${values.name ?? "organisation"}` : "New organisation"} submitLabel={submitText} onCancel={onCancel} />
        <input type="hidden" name="type" value={type} />

        <div className="mx-auto w-full max-w-[960px]">
          <div className="mb-6">
            <Label className="mb-2 block">What is it</Label>
            <SegmentedToggle options={WHAT_IS_IT} value={type as any} onChange={setType} />
          </div>

          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
            <h2 className="pt-2 text-[15px] font-medium">{type === "PE_FUND" ? "The firm" : type === "PORTFOLIO_COMPANY" ? "The company" : "The organisation"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
                {errors.name ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.name[0]}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="website">Website {aiFilled.has("website") ? <FilledByAi /> : null}</Label>
                <div className="flex gap-2">
                  <Input id="website" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} className="flex-1" />
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
                {errors.website ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.website[0]}</p> : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hqCountryCode">Headquarters {aiFilled.has("hq") ? <FilledByAi /> : null}</Label>
                <Select value={hqCountryCode} onValueChange={setHqCountryCode}>
                  <SelectTrigger id="hqCountryCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="hqCountryCode" value={hqCountryCode} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hqCity">City</Label>
                <Input id="hqCity" name="hqCity" value={hqCity} onChange={(e) => setHqCity(e.target.value)} />
              </div>

              {type === "PE_FUND" ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Offices in</Label>
                  <TagBox options={COUNTRY_OPTIONS} value={offices} onChange={setOffices} placeholder="Add country" />
                  {offices.map((c) => (
                    <input key={c} type="hidden" name="countriesOfOperation" value={c} />
                  ))}
                </div>
              ) : null}
              {type === "PORTFOLIO_COMPANY" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sectorId">Sector</Label>
                  <Select value={sectorIds[0] ?? ""} onValueChange={(v) => setSectorIds([v])}>
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
                  {sectorIds[0] ? <input type="hidden" name="sectorIds" value={sectorIds[0]} /> : null}
                </div>
              ) : null}
            </div>
          </section>

          {type === "PE_FUND" ? (
            <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
              <h2 className="pt-2 text-[15px] font-medium">Investment focus</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Strategy</Label>
                  <PillSelect options={investorStrategies.map((s) => ({ value: s.id, label: s.name }))} value={strategyIds} onChange={setStrategyIds} />
                  {strategyIds.map((id) => (
                    <input key={id} type="hidden" name="investorStrategyIds" value={id} />
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="aumAmount">Assets under management {aiFilled.has("aum") ? <FilledByAi /> : null}</Label>
                  <div className="flex gap-2">
                    <Select value={aumCurrency} onValueChange={setAumCurrency}>
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["GBP", "USD", "EUR", "AED"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="aumCurrency" value={aumCurrency} />
                    <MoneyInput key={`aum-${aumAmount}`} name="aumAmount" currency={aumCurrency} defaultValue={aumAmount} className="flex-1" />
                  </div>
                </div>
                <div />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="minCheque">Smallest equity cheque</Label>
                  <div className="flex gap-2">
                    <Select value={minChequeCurrency} onValueChange={setMinChequeCurrency}>
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["GBP", "USD", "EUR", "AED"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="typicalMinEquityChequeCurrency" value={minChequeCurrency} />
                    <MoneyInput key={`minc-${minChequeAmount}`} name="typicalMinEquityChequeAmount" currency={minChequeCurrency} defaultValue={minChequeAmount} className="flex-1" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="maxCheque">Largest equity cheque</Label>
                  <div className="flex gap-2">
                    <Select value={maxChequeCurrency} onValueChange={setMaxChequeCurrency}>
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["GBP", "USD", "EUR", "AED"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="typicalMaxEquityChequeCurrency" value={maxChequeCurrency} />
                    <MoneyInput key={`maxc-${maxChequeAmount}`} name="typicalMaxEquityChequeAmount" currency={maxChequeCurrency} defaultValue={maxChequeAmount} className="flex-1" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currentFundName">Current fund</Label>
                  <Input id="currentFundName" name="currentFundName" value={currentFundName} onChange={(e) => setCurrentFundName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fundSizeAmount">Fund size</Label>
                    <div className="flex gap-2">
                      <Select value={fundSizeCurrency} onValueChange={setFundSizeCurrency}>
                        <SelectTrigger className="w-24 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GBP", "USD", "EUR", "AED"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="fundSizeCurrency" value={fundSizeCurrency} />
                      <MoneyInput key={`fs-${fundSizeAmount}`} name="fundSizeAmount" currency={fundSizeCurrency} defaultValue={fundSizeAmount} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fundVintageYear">Vintage</Label>
                    <Select value={vintageYear ? String(vintageYear) : ""} onValueChange={setVintageYear}>
                      <SelectTrigger id="fundVintageYear">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {VINTAGE_YEARS.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="fundVintageYear" value={vintageYear} />
                  </div>
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Sectors {aiFilled.has("sectors") ? <FilledByAi /> : null}</Label>
                  <TagBox options={sectors.map((s) => ({ value: s.id, label: s.name }))} value={sectorIds} onChange={setSectorIds} placeholder="Add sector" />
                  {sectorIds.map((id) => (
                    <input key={id} type="hidden" name="sectorIds" value={id} />
                  ))}
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Regions they invest in</Label>
                  <PillSelect options={REGIONS} value={regions} onChange={setRegions} />
                  {regions.map((r) => (
                    <input key={r} type="hidden" name="investmentRegions" value={r} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {type === "PORTFOLIO_COMPANY" ? (
            <>
              <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                <h2 className="pt-2 text-[15px] font-medium">Ownership</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Owned by</Label>
                    <OrganisationCombobox
                      name="ownedByOrganizationId"
                      defaultId={ownedByOrganizationId}
                      defaultName={ownedByOrganizationName}
                      onNameChange={setOwnedByOrganizationName}
                      placeholder="Search"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fundVehicleName">Fund vehicle</Label>
                    <Input id="fundVehicleName" name="fundVehicleName" value={fundVehicleName} onChange={(e) => setFundVehicleName(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="dealType">Deal type</Label>
                    <Select value={dealType} onValueChange={setDealType}>
                      <SelectTrigger id="dealType">
                        <SelectValue placeholder="Select deal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEAL_TYPES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {label(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="dealType" value={dealType} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ownershipLevel">Ownership</Label>
                    <Select value={ownershipLevel} onValueChange={setOwnershipLevel}>
                      <SelectTrigger id="ownershipLevel">
                        <SelectValue placeholder="Select ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_LEVELS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {label(o)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="ownershipLevel" value={ownershipLevel} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="investedDate">Invested</Label>
                    <Input id="investedDate" name="investedDate" type="month" value={investedDate} onChange={(e) => setInvestedDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="likelyExitWindow">Expected exit</Label>
                    <Input id="likelyExitWindow" name="likelyExitWindow" placeholder="2029 to 2030" value={likelyExitWindow} onChange={(e) => setLikelyExitWindow(e.target.value)} />
                  </div>

                  <div className="col-span-2 flex flex-col gap-2">
                    {coInvestorIds.map((id, i) => (
                      <OrganisationCombobox key={id || `new-${i}`} name="coInvestorOrganizationIds" defaultId={id} placeholder="Search" />
                    ))}
                    <button type="button" onClick={() => setCoInvestorIds((prev) => [...prev, ""])} className="flex w-fit items-center gap-1.5 text-[13px] text-[var(--color-ink2)]">
                      <Plus className="h-3.5 w-3.5" /> Add co-investor
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                <h2 className="pt-2 text-[15px] font-medium">Size</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="revenueAmount">Revenue</Label>
                    <div className="flex gap-2">
                      <Select value={revenueCurrency} onValueChange={setRevenueCurrency}>
                        <SelectTrigger className="w-24 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GBP", "USD", "EUR", "AED"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="revenueCurrency" value={revenueCurrency} />
                      <MoneyInput key={`rev-${revenueAmount}`} name="revenueAmount" currency={revenueCurrency} defaultValue={revenueAmount} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ebitdaAmount">EBITDA</Label>
                    <div className="flex gap-2">
                      <Select value={ebitdaCurrency} onValueChange={setEbitdaCurrency}>
                        <SelectTrigger className="w-24 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["GBP", "USD", "EUR", "AED"].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="ebitdaCurrency" value={ebitdaCurrency} />
                      <MoneyInput key={`eb-${ebitdaAmount}`} name="ebitdaAmount" currency={ebitdaCurrency} defaultValue={ebitdaAmount} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="employeeCountMin">Employees</Label>
                    <div className="flex items-center gap-2">
                      <Input id="employeeCountMin" name="employeeCountMin" type="number" min={0} value={employeeMin} onChange={(e) => setEmployeeMin(e.target.value)} />
                      <span className="text-[var(--color-ink-subtle)]">to</span>
                      <Input name="employeeCountMax" type="number" min={0} value={employeeMax} onChange={(e) => setEmployeeMax(e.target.value)} />
                    </div>
                  </div>
                </div>
              </section>

              {isEdit ? (
                <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                  <h2 className="pt-2 text-[15px] font-medium">Leadership</h2>
                  <p className="pt-2 text-[13px] text-[var(--color-ink-subtle)]">Add the people at this company from the record once it is saved.</p>
                </section>
              ) : null}
            </>
          ) : null}

          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
            <h2 className="pt-2 text-[15px] font-medium">Your relationship</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
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
                <input type="hidden" name="status" value={status} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="relationshipOwnerId">Owner</Label>
                <Select value={relationshipOwnerId} onValueChange={setRelationshipOwnerId}>
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
                <input type="hidden" name="relationshipOwnerId" value={relationshipOwnerId} />
              </div>

              {type === "PE_FUND" ? (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="hiringPracticeAreaIds">Practices they hire</Label>
                  <Select value={hiringPracticeKeys[0] ?? ""} onValueChange={(v) => setHiringPracticeKeys((prev) => (prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]))}>
                    <SelectTrigger id="hiringPracticeAreaIds">
                      <SelectValue placeholder="Select practices">{hiringPracticeKeys.map((k) => PRACTICE_LABEL[k as keyof typeof PRACTICE_LABEL]).join(", ") || undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {hiringPracticeKeys.includes(p) ? "✓ " : ""}
                          {PRACTICE_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hiringPracticeKeys.map((k) => (
                    <input key={k} type="hidden" name="hiringPracticeAreaIds" value={k} />
                  ))}
                </div>
              ) : null}

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="internalSummary">Notes</Label>
                <Textarea id="internalSummary" name="internalSummary" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </section>

          {researchError ? <p className="pb-4 text-[13px] text-[var(--color-status-danger-ink)]">{researchError}</p> : null}
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
