"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganisationCombobox } from "@/components/ui/organisation-combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PillSelect } from "@/components/ui/pill-select";
import { TagBox } from "@/components/ui/tag-box";
import { RolePicker } from "@/components/ui/role-picker";
import { MoneyInput } from "@/components/ui/money-input";
import { FormPageHeader } from "@/components/ui/form-page-header";
import { label } from "@/lib/labels";
import { COUNTRIES } from "@/lib/iso";
import { PRACTICES, PRACTICE_LABEL, type Practice } from "@/lib/practices";
import type { PersonFormState } from "./actions";

const RELATIONSHIP_STATUSES = ["RESEARCH_ONLY", "OUTREACH_PLANNED", "CONTACTED", "ENGAGED", "ACTIVE_RELATIONSHIP", "DORMANT", "DO_NOT_CONTACT", "ARCHIVED"];
const SENIORITIES = ["BOARD_OR_C_SUITE", "N_MINUS_1", "DIRECTOR_OR_VP", "HEAD_OF", "SENIOR_MANAGER", "MANAGER", "INDIVIDUAL_CONTRIBUTOR", "CONSULTANT_OR_INTERIM", "OTHER"];
const DEAL_EXPERIENCE = [
  { value: "BUY_AND_BUILD", label: "Buy and build" },
  { value: "CARVE_OUT", label: "Carve-out" },
  { value: "REFINANCING", label: "Refinancing" },
  { value: "EXIT_OR_SALE", label: "Exit or sale" },
  { value: "IPO", label: "IPO" },
  { value: "TURNAROUND", label: "Turnaround" },
  { value: "INTEGRATION", label: "Integration" },
];
const EQUITY_TYPES = ["NONE", "SWEET_EQUITY", "OPTIONS", "CO_INVEST"];
const OPEN_TO_OPTIONS = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "INTERIM", label: "Interim" },
  { value: "NON_EXEC", label: "Non-exec" },
];
const LOOKING_STATUSES = ["ACTIVELY_LOOKING", "OPEN_TO_OFFERS", "NOT_LOOKING", "PLACED_BY_US"];
const ROLE_AT_FIRM = [
  "MANAGING_PARTNER",
  "PARTNER",
  "OPERATING_PARTNER",
  "PRINCIPAL",
  "INVESTMENT_DIRECTOR",
  "ASSOCIATE",
  "HEAD_OF_TALENT",
  "HEAD_OF_PORTFOLIO",
  "PORTFOLIO_CEO",
  "PORTFOLIO_CFO",
  "CHAIR",
  "NON_EXEC",
  "OTHER",
];
const CONTACT_RELATIONSHIPS = ["COLD", "WARM", "STRONG", "CLIENT"];
const DECISION_ROLES = ["HIRING_DECISION_MAKER", "INFLUENCER", "GATEKEEPER", "REFERRER"];
const WHO_ARE_THEY = [
  { value: "CANDIDATE", label: "Candidate" },
  { value: "CLIENT_CONTACT", label: "Client contact" },
  { value: "OTHER", label: "Other" },
] as const;
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

export function PersonForm({
  action,
  users,
  sectors,
  defaultValues,
  submitLabel,
  presetOrganizationId,
  presetOrganizationName,
  cancelHref = "/people",
}: {
  action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  users: { id: string; firstName: string; lastName: string }[];
  sectors: { id: string; name: string }[];
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  presetOrganizationId?: string;
  presetOrganizationName?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const values = { ...defaultValues, ...(state.formValues ?? {}) } as Record<string, any>;
  const errors = state.errors ?? {};
  const isEdit = Boolean(defaultValues);

  const [who, setWho] = useState<string>(values.personCategory ?? "CANDIDATE");
  const [firstName, setFirstName] = useState(values.firstName ?? "");
  const [lastName, setLastName] = useState(values.lastName ?? "");
  const [email, setEmail] = useState(values.primaryEmail ?? "");
  const [phone, setPhone] = useState(values.primaryPhone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(values.linkedinUrl ?? "");
  const [dupMatch, setDupMatch] = useState<{ id: string; name: string; orgName: string | null } | null>(null);
  const [dupDismissed, setDupDismissed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [practiceKeys, setPracticeKeys] = useState<string[]>(values.practiceAreaIds ?? []);
  const [currentTitle, setCurrentTitle] = useState(values.currentTitle ?? values.headlineOverride ?? "");
  const [currentOrgId] = useState(values.currentOrganizationOverrideId ?? presetOrganizationId ?? "");
  const [currentOrgName, setCurrentOrgName] = useState(presetOrganizationName ?? "");
  const [seniority, setSeniority] = useState(values.seniority ?? "");
  const [countryCode, setCountryCode] = useState(values.countryCode ?? "");
  const [city, setCity] = useState(values.city ?? "");

  const [peBackedRolesCount, setPeBackedRolesCount] = useState(values.peBackedRolesCount ?? "");
  const [exitsDelivered, setExitsDelivered] = useState(values.exitsDelivered ?? "");
  const [yearsInRole, setYearsInRole] = useState(values.yearsInRole ?? "");
  const [dealExperience, setDealExperience] = useState<string[]>(values.dealExperience ?? []);
  const [candidateSectorIds, setCandidateSectorIds] = useState<string[]>(values.candidateSectorIds ?? []);
  const [baseAmount] = useState(values.currentBaseAmount ?? "");
  const [baseCurrency, setBaseCurrency] = useState(values.currentBaseCurrency ?? "GBP");
  const [bonusPercentage, setBonusPercentage] = useState(values.currentBonusPercentage ?? "");
  const [equityType, setEquityType] = useState(values.equityType ?? "");
  const [noticePeriodValue, setNoticePeriodValue] = useState(values.noticePeriodValue ?? "");
  const [openTo, setOpenTo] = useState<string[]>(values.openTo ?? []);
  const [lookingStatus, setLookingStatus] = useState(values.lookingStatus ?? "");
  const [preferredCountries, setPreferredCountries] = useState<string[]>(values.preferredCountries ?? []);
  const [languages, setLanguages] = useState<string[]>(values.languages ?? []);

  const [roleAtFirm, setRoleAtFirm] = useState(values.roleAtFirm ?? "");
  const [coveredIds, setCoveredIds] = useState<string[]>(values.coveredPortfolioCompanyIds ?? []);
  const [contactRelationship, setContactRelationship] = useState(values.contactRelationship ?? "");
  const [decisionRole, setDecisionRole] = useState(values.decisionRole ?? "");
  const [relationshipOwnerId, setRelationshipOwnerId] = useState(values.relationshipOwnerId ?? "");

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
  }, [firstName, lastName, email, dupDismissed]);

  function onCancel() {
    if (dirty) setConfirmDiscard(true);
    else router.push(cancelHref);
  }

  const submitText = submitLabel ?? (who === "CANDIDATE" ? "Save candidate" : who === "CLIENT_CONTACT" ? "Save contact" : "Save person");

  return (
    <>
      <form action={formAction} onChange={() => setDirty(true)} className="flex flex-col">
        <FormPageHeader section="People" title={isEdit ? `Edit ${values.firstName ?? "person"}` : "New person"} submitLabel={submitText} onCancel={onCancel} />
        <input type="hidden" name="personCategory" value={who} />

        <div className="mx-auto w-full max-w-[960px]">
          <div className="mb-6">
            <Label className="mb-2 block">Who are they</Label>
            <SegmentedToggle options={WHO_ARE_THEY} value={who as any} onChange={setWho} />
          </div>

          {dupMatch && !dupDismissed ? (
            <div className="mb-5 flex items-center gap-2.5 rounded-[6px] bg-[var(--color-ai-bg)] px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)]">
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

          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
            <h2 className="pt-2 text-[15px] font-medium">About them</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                {errors.firstName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.firstName[0]}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                {errors.lastName ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.lastName[0]}</p> : null}
              </div>

              {who !== "OTHER" ? (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Practice</Label>
                  <PillSelect options={PRACTICES.map((p) => ({ value: p, label: PRACTICE_LABEL[p] }))} value={practiceKeys} onChange={setPracticeKeys} />
                  {practiceKeys.map((k) => (
                    <input key={k} type="hidden" name="practiceAreaIds" value={k} />
                  ))}
                </div>
              ) : null}

              {who === "CANDIDATE" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currentTitle">Current title</Label>
                    <RolePicker practices={practiceKeys as Practice[]} value={currentTitle} onChange={setCurrentTitle} name="currentTitle" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Current company</Label>
                    <OrganisationCombobox name="currentOrganizationOverrideId" defaultId={currentOrgId} defaultName={currentOrgName} onNameChange={setCurrentOrgName} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="seniority">Seniority</Label>
                    <Select value={seniority} onValueChange={setSeniority}>
                      <SelectTrigger id="seniority">
                        <SelectValue placeholder="Select seniority" />
                      </SelectTrigger>
                      <SelectContent>
                        {SENIORITIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="seniority" value={seniority} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <input type="hidden" name="countryCode" value={countryCode} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : null}

              {who === "CLIENT_CONTACT" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>Organisation</Label>
                    <OrganisationCombobox name="currentOrganizationOverrideId" defaultId={currentOrgId} defaultName={currentOrgName} onNameChange={setCurrentOrgName} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="roleAtFirm">Role at the firm</Label>
                    <Select value={roleAtFirm} onValueChange={setRoleAtFirm}>
                      <SelectTrigger id="roleAtFirm">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_AT_FIRM.map((r) => (
                          <SelectItem key={r} value={r}>
                            {label(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="roleAtFirm" value={roleAtFirm} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <input type="hidden" name="countryCode" value={countryCode} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
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
                </>
              ) : null}

              {who === "OTHER" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="headlineOverride">Title</Label>
                  <Input id="headlineOverride" name="headlineOverride" defaultValue={values.headlineOverride} />
                </div>
              ) : null}
            </div>
          </section>

          {who === "CANDIDATE" ? (
            <>
              <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                <h2 className="pt-2 text-[15px] font-medium">CV</h2>
                <div className="flex h-24 items-center justify-center gap-3 rounded-[6px] border border-dashed border-[var(--color-line)] bg-[var(--color-card)] text-[13.5px] text-[var(--color-ink-subtle)]">
                  <Upload className="h-4 w-4" />
                  Drop a CV here
                </div>
              </section>

              <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                <h2 className="pt-2 text-[15px] font-medium">PE experience</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="peBackedRolesCount">PE-backed roles</Label>
                    <Input id="peBackedRolesCount" name="peBackedRolesCount" type="number" min={0} value={peBackedRolesCount} onChange={(e) => setPeBackedRolesCount(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="exitsDelivered">Exits delivered</Label>
                    <Input id="exitsDelivered" name="exitsDelivered" type="number" min={0} value={exitsDelivered} onChange={(e) => setExitsDelivered(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="yearsInRole">Years in role</Label>
                    <Input id="yearsInRole" name="yearsInRole" type="number" min={0} value={yearsInRole} onChange={(e) => setYearsInRole(e.target.value)} />
                  </div>
                  <div className="col-span-3 flex flex-col gap-1.5">
                    <Label>Deal experience</Label>
                    <PillSelect options={DEAL_EXPERIENCE} value={dealExperience} onChange={setDealExperience} />
                    {dealExperience.map((d) => (
                      <input key={d} type="hidden" name="dealExperience" value={d} />
                    ))}
                  </div>
                  <div className="col-span-3 flex flex-col gap-1.5">
                    <Label>Sectors</Label>
                    <TagBox options={sectors.map((s) => ({ value: s.id, label: s.name }))} value={candidateSectorIds} onChange={setCandidateSectorIds} placeholder="Add sector" />
                    {candidateSectorIds.map((id) => (
                      <input key={id} type="hidden" name="candidateSectorIds" value={id} />
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
                <h2 className="pt-2 text-[15px] font-medium">Package and move</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currentBaseAmount">Base salary</Label>
                    <div className="flex gap-2">
                      <Select value={baseCurrency} onValueChange={setBaseCurrency}>
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
                      <input type="hidden" name="currentBaseCurrency" value={baseCurrency} />
                      <MoneyInput key={`base-${baseAmount}`} name="currentBaseAmount" currency={baseCurrency} defaultValue={baseAmount} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="currentBonusPercentage">Bonus</Label>
                    <Input id="currentBonusPercentage" name="currentBonusPercentage" type="number" min={0} placeholder="%" value={bonusPercentage} onChange={(e) => setBonusPercentage(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="equityType">Equity</Label>
                    <Select value={equityType} onValueChange={setEquityType}>
                      <SelectTrigger id="equityType">
                        <SelectValue placeholder="Select equity" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUITY_TYPES.map((e) => (
                          <SelectItem key={e} value={e}>
                            {label(e)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="equityType" value={equityType} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="noticePeriodValue">Notice period</Label>
                    <Input id="noticePeriodValue" name="noticePeriodValue" type="number" min={0} value={noticePeriodValue} onChange={(e) => setNoticePeriodValue(e.target.value)} />
                    <input type="hidden" name="noticePeriodUnit" value="months" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Open to</Label>
                    <PillSelect options={OPEN_TO_OPTIONS} value={openTo} onChange={setOpenTo} />
                    {openTo.map((o) => (
                      <input key={o} type="hidden" name="openTo" value={o} />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lookingStatus">Status</Label>
                    <Select value={lookingStatus} onValueChange={setLookingStatus}>
                      <SelectTrigger id="lookingStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOOKING_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="lookingStatus" value={lookingStatus} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Willing to work in</Label>
                    <TagBox options={COUNTRY_OPTIONS} value={preferredCountries} onChange={setPreferredCountries} placeholder="Add country" />
                    {preferredCountries.map((c) => (
                      <input key={c} type="hidden" name="preferredCountries" value={c} />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Languages</Label>
                    <TagBox options={[]} value={languages} onChange={setLanguages} placeholder="Add language" allowCustom />
                    {languages.map((l) => (
                      <input key={l} type="hidden" name="languages" value={l} />
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {who === "CLIENT_CONTACT" ? (
            <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
              <h2 className="pt-2 text-[15px] font-medium">What they hire</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Covers these portfolio companies</Label>
                  <div className="flex flex-col gap-2">
                    {coveredIds.map((id, i) => (
                      <OrganisationCombobox key={id || `new-${i}`} name="coveredPortfolioCompanyIds" defaultId={id} placeholder="Search" />
                    ))}
                    <button type="button" onClick={() => setCoveredIds((prev) => [...prev, ""])} className="w-fit text-[13px] text-[var(--color-ink2)]">
                      + Add company
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactRelationship">Relationship</Label>
                  <Select value={contactRelationship} onValueChange={setContactRelationship}>
                    <SelectTrigger id="contactRelationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {label(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="contactRelationship" value={contactRelationship} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="decisionRole">Decision role</Label>
                  <Select value={decisionRole} onValueChange={setDecisionRole}>
                    <SelectTrigger id="decisionRole">
                      <SelectValue placeholder="Select decision role" />
                    </SelectTrigger>
                    <SelectContent>
                      {DECISION_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {label(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="decisionRole" value={decisionRole} />
                </div>
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
            <h2 className="pt-2 text-[15px] font-medium">Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="primaryEmail">Email</Label>
                <Input id="primaryEmail" name="primaryEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {errors.primaryEmail ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.primaryEmail[0]}</p> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="primaryPhone">Mobile</Label>
                <Input id="primaryPhone" name="primaryPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <Input id="linkedinUrl" name="linkedinUrl" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
              </div>
            </div>
          </section>

          {isEdit ? (
            <section className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-4 border-t border-[var(--color-line)] py-6">
              <h2 className="pt-2 text-[15px] font-medium">Relationship</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="relationshipStatus">Status</Label>
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
              </div>
            </section>
          ) : null}
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
