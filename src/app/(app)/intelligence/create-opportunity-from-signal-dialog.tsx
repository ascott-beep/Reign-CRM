"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrganisationCombobox } from "@/components/ui/organisation-combobox";
import { PillSelect } from "@/components/ui/pill-select";
import { RolePicker } from "@/components/ui/role-picker";
import { MoneyInput } from "@/components/ui/money-input";
import { PRACTICES, PRACTICE_LABEL, type Practice } from "@/lib/practices";
import { label } from "@/lib/labels";
import { getOpportunityDraftFromSignalAction, createOpportunityFromSignalAction, type OpportunityDraftFromSignal } from "./actions";
import type { OpportunityStage } from "@prisma/client";

const STAGE_OPTIONS: OpportunityStage[] = ["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "DISCOVERY_ARRANGED", "QUALIFIED", "PROPOSAL_OR_TERMS"];

function FromSignalTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-[var(--color-ai-icon)]">
      <Sparkles className="h-2.5 w-2.5" /> From signal
    </span>
  );
}

/**
 * Round 5 screen 11 "Create opportunity" dialog. A real <form> (not loose
 * client state) because OrganisationCombobox only ever exposes the id it
 * resolved to via its own hidden input, read here through FormData on
 * submit -- same convention the main opportunity form uses. "From signal"
 * tags compare the field's *live displayed text/value* against what the
 * draft started with, rather than a flip-once-edited flag: the combobox's
 * own mount effect calls onNameChange with the default name once on
 * mount, which would otherwise immediately (and wrongly) clear the tag.
 */
export function CreateOpportunityFromSignalDialog({
  item,
  open,
  onClose,
}: {
  item: { id: string; title: string; organization: { name: string }; sources: { url: string; title: string | null }[] };
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<OpportunityDraftFromSignal | null>(null);
  const loading = draft === null;
  const formRef = useRef<HTMLFormElement>(null);

  const [clientQuery, setClientQuery] = useState("");
  const [portfolioQuery, setPortfolioQuery] = useState("");
  const [practiceKey, setPracticeKey] = useState("");
  const [role, setRole] = useState("");
  const [clientContactId, setClientContactId] = useState("");
  const [stage, setStage] = useState<OpportunityStage>("SIGNAL_IDENTIFIED");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeCurrency, setFeeCurrency] = useState("GBP");
  const [nextStep, setNextStep] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOpportunityDraftFromSignalAction(item.id).then((d) => {
      if (cancelled) return;
      setDraft(d);
      setClientQuery(d.clientOrganizationName);
      setPortfolioQuery(d.portfolioCompanyName ?? "");
      setPracticeKey(d.practiceKey ?? "");
      setRole(d.role);
      setClientContactId(d.clientContactId ?? "");
      setStage(d.stage as OpportunityStage);
      setFeeAmount(d.estimatedFeeAmount);
      setFeeCurrency(d.estimatedFeeCurrency);
      setNextStep(d.nextStep);
    });
    return () => {
      cancelled = true;
    };
  }, [open, item.id]);

  function submit() {
    if (!formRef.current || !draft) return;
    const fd = new FormData(formRef.current);
    const hiringOrganizationId = String(fd.get("hiringOrganizationId") ?? "");
    if (!hiringOrganizationId) return;
    startTransition(async () => {
      await createOpportunityFromSignalAction(item.id, {
        hiringOrganizationId,
        portfolioCompanyId: String(fd.get("portfolioCompanyId") ?? "") || null,
        practiceKey: practiceKey || null,
        potentialRoleTitle: role,
        leadContactPersonId: clientContactId || null,
        stage,
        estimatedFeeAmount: feeAmount ? Number(feeAmount) : null,
        estimatedFeeCurrency: feeAmount ? feeCurrency : null,
        nextStepSummary: nextStep,
      });
    });
  }

  const source = item.sources[0];
  const clientTag = draft !== null && draft.clientFromSignal && clientQuery === draft.clientOrganizationName;
  const portfolioTag = draft !== null && draft.portfolioCompanyFromSignal && portfolioQuery === (draft.portfolioCompanyName ?? "");
  const practiceTag = draft !== null && draft.practiceFromSignal && practiceKey === (draft.practiceKey ?? "");
  const roleTag = draft !== null && draft.roleFromSignal && role === draft.role;
  const contactTag = draft !== null && draft.clientContactFromSignal && clientContactId === (draft.clientContactId ?? "");
  const nextStepTag = draft !== null && draft.nextStepFromSignal && nextStep === draft.nextStep;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create opportunity</DialogTitle>
          <p className="text-[13px] text-[var(--color-ink-subtle)]">
            From: {item.title}
            {source ? ` · ${source.title || item.organization.name}` : ""}
          </p>
        </DialogHeader>

        {loading || !draft ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-subtle)]">Loading…</p>
        ) : (
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="grid grid-cols-2 gap-x-5 gap-y-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>
                Client
                <FromSignalTag show={clientTag} />
              </Label>
              <OrganisationCombobox
                name="hiringOrganizationId"
                defaultId={draft.clientOrganizationId}
                defaultName={draft.clientOrganizationName}
                onNameChange={setClientQuery}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Portfolio company
                <FromSignalTag show={portfolioTag} />
              </Label>
              <OrganisationCombobox
                name="portfolioCompanyId"
                defaultId={draft.portfolioCompanyId}
                defaultName={draft.portfolioCompanyName}
                placeholder="If different from the client"
                onNameChange={setPortfolioQuery}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Practice
                <FromSignalTag show={practiceTag} />
              </Label>
              <PillSelect
                multi={false}
                options={PRACTICES.map((p) => ({ value: p, label: PRACTICE_LABEL[p] }))}
                value={practiceKey ? [practiceKey] : []}
                onChange={(v) => setPracticeKey(v[0] ?? "")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Role
                <FromSignalTag show={roleTag} />
              </Label>
              <RolePicker practices={practiceKey ? [practiceKey as Practice] : []} value={role} onChange={setRole} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Client contact
                <FromSignalTag show={contactTag} />
              </Label>
              <Select value={clientContactId} onValueChange={setClientContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {draft.clientContactOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.role ? ` · ${label(c.role)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as OpportunityStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {label(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Estimated fee</Label>
              <div className="flex gap-2">
                <MoneyInput name="estimatedFeeAmount" currency={feeCurrency} defaultValue={feeAmount} onValueChange={setFeeAmount} />
                <Select value={feeCurrency} onValueChange={setFeeCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Next step
                <FromSignalTag show={nextStepTag} />
              </Label>
              <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
            </div>
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || loading} onClick={submit}>
            {pending ? "Creating…" : "Create opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
