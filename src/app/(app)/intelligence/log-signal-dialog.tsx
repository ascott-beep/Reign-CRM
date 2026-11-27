"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { label } from "@/lib/labels";
import { createIntelligenceAction } from "./actions";

const TYPES = [
  "LEADERSHIP_CHANGE",
  "POTENTIAL_VACANCY",
  "ACTIVE_VACANCY",
  "ACQUISITION",
  "INTEGRATION",
  "CARVE_OUT",
  "TRANSFORMATION",
  "INTERNATIONAL_EXPANSION",
  "EXIT_PREPARATION",
  "REFINANCING",
  "FINANCE_TEAM_WEAKNESS",
  "FAILED_SEARCH",
  "AGENCY_DISSATISFACTION",
  "CANDIDATE_MOVEMENT",
  "OTHER",
];

const CONFIDENCE_OPTIONS = [
  { value: "UNVERIFIED", label: "Rumour" },
  { value: "PARTIALLY_VERIFIED", label: "Likely" },
  { value: "VERIFIED", label: "Verified" },
] as const;

const RELEVANCE_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
] as const;

/** Round 4 screen 22 (DlgR4LogSignal) — a quick pop-up for a signal the team heard directly, filed in the same Intelligence list as AI research signals (createIntelligenceAction). */
export function LogSignalDialog({
  open,
  onClose,
  organizations,
  currentUserId,
  presetOrganizationId,
}: {
  open: boolean;
  onClose: () => void;
  organizations: { id: string; name: string }[];
  currentUserId: string;
  presetOrganizationId?: string;
}) {
  const [state, formAction] = useActionState(createIntelligenceAction, {});
  const errors = state.errors ?? {};
  const [organizationId, setOrganizationId] = useState(presetOrganizationId ?? "");
  const [type, setType] = useState("LEADERSHIP_CHANGE");
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE_OPTIONS)[number]["value"]>("PARTIALLY_VERIFIED");
  const [relevance, setRelevance] = useState<(typeof RELEVANCE_OPTIONS)[number]["value"]>("HIGH");

  const orgName = organizations.find((o) => o.id === organizationId)?.name ?? "";
  const title = orgName ? `${orgName} · ${label(type)}` : label(type);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a signal</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="dateReceived" value={new Date().toISOString().slice(0, 10)} />
          <input type="hidden" name="ownerId" value={currentUserId} />
          <input type="hidden" name="confidence" value={confidence} />
          <input type="hidden" name="commercialRelevance" value={relevance} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationId">Organisation</Label>
              <Select name="organizationId" value={organizationId} onValueChange={setOrganizationId} required>
                <SelectTrigger id="organizationId">
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
              {errors.organizationId ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.organizationId[0]}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">What happened</Label>
              <Select name="type" value={type} onValueChange={setType}>
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
            <Label htmlFor="details">Summary</Label>
            <Textarea id="details" name="details" rows={3} placeholder="e.g. CFO understood to be leaving after the refinancing" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceUrl">Source link</Label>
            <Input id="sourceUrl" name="sourceUrl" placeholder="e.g. https://www.ft.com/..." />
            <p className="text-xs text-[var(--color-ink-subtle)]">Optional. Add more sources after saving.</p>
            {errors.sourceUrl ? <p className="text-xs text-[var(--color-status-danger-ink)]">{errors.sourceUrl[0]}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>How sure are we?</Label>
              <SegmentedToggle options={CONFIDENCE_OPTIONS} value={confidence} onChange={setConfidence} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Relevance</Label>
              <SegmentedToggle options={RELEVANCE_OPTIONS} value={relevance} onChange={setRelevance} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Logging…" : "Log signal"}
    </Button>
  );
}
