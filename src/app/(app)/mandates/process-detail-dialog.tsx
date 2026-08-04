"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { label } from "@/lib/labels";
import { format } from "date-fns";
import { InterviewDialog } from "./interview-dialog";
import { OfferDialog } from "./offer-dialog";
import { PlaceCandidateDialog } from "./place-candidate-dialog";
import { updateProcessAssessmentAction, changeProcessStageAction } from "./candidate-process-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIMPLE_STAGES = [
  "SOURCED",
  "LONGLISTED",
  "CONTACT_REQUIRED",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "SUBMITTED",
  "CLIENT_REVIEW",
  "FIRST_INTERVIEW",
  "FURTHER_INTERVIEW",
  "FINAL_INTERVIEW",
  "ON_HOLD",
];

type ProcessDetail = {
  id: string;
  stage: string;
  mandateId: string;
  mandateTitle: string;
  mandateReference: string;
  organizationName: string;
  candidatePersonId: string;
  candidateName: string;
  candidateRating: string | null;
  candidateStatus: string | null;
  overallScore: number | null;
  functionalFitScore: number | null;
  peExperienceScore: number | null;
  sectorFitScore: number | null;
  motivationScore: number | null;
  compensationFitScore: number | null;
  locationFitScore: number | null;
  assessmentSummary: string | null;
  risksConcerns: string | null;
  clientFeedback: string | null;
  rejectionReason: string | null;
  rejectionExplanation: string | null;
  withdrawalReason: string | null;
  withdrawalExplanation: string | null;
  stageHistory: { id: string; fromStage: string | null; toStage: string; changedAt: string; changedBy: string }[];
  interviews: { id: string; type: string; roundNumber: number; scheduledStart: string; outcome: string; locationOrLink: string | null }[];
  offers: { id: string; status: string; baseAmount: string | null; baseCurrency: string | null; offerDate: string | null }[];
  placement: { id: string; placementDate: string; status: string } | null;
};

const SCORE_FIELDS: { key: keyof ProcessDetail; label: string }[] = [
  { key: "overallScore", label: "Overall" },
  { key: "functionalFitScore", label: "Functional Fit" },
  { key: "peExperienceScore", label: "PE Experience" },
  { key: "sectorFitScore", label: "Sector Fit" },
  { key: "motivationScore", label: "Motivation" },
  { key: "compensationFitScore", label: "Compensation Fit" },
  { key: "locationFitScore", label: "Location Fit" },
];

export function ProcessDetailDialog({
  candidateProcessId,
  onClose,
  onStageChange,
}: {
  candidateProcessId: string | null;
  onClose: () => void;
  onStageChange?: (candidateProcessId: string, stage: string) => void;
}) {
  const [detail, setDetail] = useState<ProcessDetail | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);

  const load = useCallback(() => {
    if (!candidateProcessId) return;
    fetch(`/api/candidate-processes/${candidateProcessId}`)
      .then((r) => r.json())
      .then((data) => setDetail(data));
  }, [candidateProcessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!candidateProcessId) return null;
  const loading = !detail || detail.id !== candidateProcessId;

  return (
    <Dialog open={candidateProcessId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail ? detail.candidateName : "Loading…"}</DialogTitle>
        </DialogHeader>
        {loading || !detail ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-subtle)]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/people/${detail.candidatePersonId}`} className="text-[var(--color-accent)]">
                View full candidate profile
              </Link>
              {SIMPLE_STAGES.includes(detail.stage) ? (
                <Select
                  value={detail.stage}
                  onValueChange={(toStage) =>
                    changeProcessStageAction({ candidateProcessId: detail.id, toStage }).then(() => {
                      onStageChange?.(detail.id, toStage);
                      load();
                    })
                  }
                >
                  <SelectTrigger aria-label="Change candidate stage" className="h-7 w-48 text-xs">
                    <SelectValue placeholder={label(detail.stage)} />
                  </SelectTrigger>
                  <SelectContent>
                    {SIMPLE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge tone="neutral">{label(detail.stage)}</Badge>
              )}
              {detail.candidateRating ? <Badge tone="info">{label(detail.candidateRating)}</Badge> : null}
            </div>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              {detail.mandateReference} — {detail.mandateTitle} · {detail.organizationName}
            </p>

            {detail.rejectionReason ? (
              <p className="rounded-md bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-ink)]">
                Rejected: {label(detail.rejectionReason)} {detail.rejectionExplanation ? `— ${detail.rejectionExplanation}` : ""}
              </p>
            ) : null}
            {detail.withdrawalReason ? (
              <p className="rounded-md bg-[var(--color-status-warning-bg)] px-3 py-2 text-sm text-[var(--color-status-warning-ink)]">
                Withdrawn: {label(detail.withdrawalReason)} {detail.withdrawalExplanation ? `— ${detail.withdrawalExplanation}` : ""}
              </p>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Assessment</h3>
              <form action={async (fd) => { await updateProcessAssessmentAction(fd); load(); }} className="flex flex-col gap-3">
                <input type="hidden" name="candidateProcessId" value={detail.id} />
                <div className="grid grid-cols-4 gap-2">
                  {SCORE_FIELDS.map((f) => (
                    <div key={String(f.key)} className="flex flex-col gap-1">
                      <Label className="text-[10px]">{f.label}</Label>
                      <Input name={String(f.key)} type="number" min={1} max={5} defaultValue={(detail[f.key] as number | null) ?? undefined} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Assessment summary</Label>
                  <Textarea name="assessmentSummary" rows={2} defaultValue={detail.assessmentSummary ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Client feedback</Label>
                  <Textarea name="clientFeedback" rows={2} defaultValue={detail.clientFeedback ?? ""} />
                </div>
                <div>
                  <Button type="submit" size="sm" variant="secondary">
                    Save assessment
                  </Button>
                </div>
              </form>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Interviews</h3>
                <InterviewDialog candidateProcessId={detail.id} onScheduled={load} />
              </div>
              {detail.interviews.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-subtle)]">No interviews scheduled.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {detail.interviews.map((i) => (
                    <li key={i.id} className="flex items-center justify-between text-sm">
                      <span>Round {i.roundNumber} — {label(i.type)}</span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">
                        {format(new Date(i.scheduledStart), "d MMM yyyy HH:mm")} · {label(i.outcome)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Offer</h3>
                {detail.stage !== "PLACED" ? (
                  <Button size="sm" variant="secondary" onClick={() => setOfferDialogOpen(true)}>
                    Create offer
                  </Button>
                ) : null}
              </div>
              {detail.offers.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-subtle)]">No offer yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {detail.offers.map((o) => (
                    <li key={o.id} className="flex items-center justify-between text-sm">
                      <span>{o.baseAmount ? `${o.baseCurrency} ${o.baseAmount}` : "—"}</span>
                      <Badge tone="info">{label(o.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.placement ? (
              <p className="rounded-md bg-[var(--color-status-success-bg)] px-3 py-2 text-sm text-[var(--color-status-success-ink)]">
                Placed on {format(new Date(detail.placement.placementDate), "d MMM yyyy")} — {label(detail.placement.status)}
              </p>
            ) : detail.stage !== "REJECTED" && detail.stage !== "WITHDRAWN" ? (
              <div>
                <Button size="sm" onClick={() => setPlaceDialogOpen(true)}>
                  Mark as Placed
                </Button>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Stage history</h3>
              <ul className="flex flex-col gap-1">
                {detail.stageHistory.map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-xs text-[var(--color-ink-subtle)]">
                    <span>
                      {h.fromStage ? `${label(h.fromStage)} → ` : ""}
                      {label(h.toStage)}
                    </span>
                    <span>
                      {format(new Date(h.changedAt), "d MMM yyyy HH:mm")} · {h.changedBy}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>

      <OfferDialog
        open={offerDialogOpen}
        candidateProcessId={offerDialogOpen ? detail?.id ?? null : null}
        onClose={() => setOfferDialogOpen(false)}
        onDone={() => {
          setOfferDialogOpen(false);
          if (detail) onStageChange?.(detail.id, "OFFER");
          load();
        }}
      />
      <PlaceCandidateDialog
        open={placeDialogOpen}
        candidateProcessId={placeDialogOpen ? detail?.id ?? null : null}
        onClose={() => setPlaceDialogOpen(false)}
        onDone={() => {
          setPlaceDialogOpen(false);
          if (detail) onStageChange?.(detail.id, "PLACED");
          load();
        }}
      />
    </Dialog>
  );
}
