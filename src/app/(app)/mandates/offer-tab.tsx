import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/states";
import { label } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";

type MoneyValue = number | string | { toString(): string } | null;

type OfferRow = {
  id: string;
  status: string;
  offerDate: Date | null;
  baseAmount: MoneyValue;
  baseCurrency: string | null;
  bonusAmount: MoneyValue;
  bonusPercentage: MoneyValue;
  equityDetails: string | null;
  noticeConsiderations: string | null;
  proposedStartDate: Date | null;
  candidateResponseDate: Date | null;
  declineOrWithdrawalReason: string | null;
};

type CandidateRow = {
  id: string;
  candidatePerson: { firstName: string; lastName: string };
  offers: OfferRow[];
  placement: { startDate: Date | null; placementDate: Date; guaranteeEndDate: Date | null } | null;
};

function Milestone({ label: stepLabel, date }: { label: string; date: Date | null }) {
  const done = Boolean(date);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className={`h-1.5 rounded-full ${done ? "bg-[var(--color-pos)]" : "bg-[var(--color-track)]"}`} />
      <div className="text-[13px]">
        <span className={done ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}>{stepLabel}</span>
        <div className="text-xs text-[var(--color-muted)]">{date ? formatDate(date) : "Not yet"}</div>
      </div>
    </div>
  );
}

function CandidateOfferCard({ row }: { row: CandidateRow }) {
  const offer = row.offers[0] ?? null;
  const placed = Boolean(row.placement);
  const declined = offer?.status === "DECLINED" || offer?.status === "WITHDRAWN";
  const started = row.placement?.startDate ?? (placed ? row.placement?.placementDate ?? null : null);
  const accepted = offer?.status === "ACCEPTED" ? offer.candidateResponseDate ?? offer.offerDate : placed ? row.placement?.placementDate ?? null : null;

  return (
    <Card className={declined ? "opacity-60" : undefined}>
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[11px] font-semibold text-[var(--color-navy-ink)]">
              {row.candidatePerson.firstName.charAt(0)}
              {row.candidatePerson.lastName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {row.candidatePerson.firstName} {row.candidatePerson.lastName}
              </p>
              <p className="text-xs text-[var(--color-ink-subtle)]">{offer ? label(offer.status).toLowerCase() : "offer in progress"}</p>
            </div>
          </div>
          {placed ? <Badge tone="success">Placed</Badge> : declined ? <Badge tone="neutral">{label(offer!.status)}</Badge> : null}
        </div>
        {declined && offer?.declineOrWithdrawalReason ? <p className="text-sm text-[var(--color-ink-subtle)]">{offer.declineOrWithdrawalReason}</p> : null}
        <div className="flex gap-4">
          <Milestone label="Verbal offer" date={null} />
          <Milestone label="Written offer" date={offer?.offerDate ?? null} />
          <Milestone label="Accepted" date={accepted} />
          <Milestone label="Started" date={started} />
        </div>
      </CardContent>
    </Card>
  );
}

export function OfferTab({ candidates }: { candidates: CandidateRow[] }) {
  if (candidates.length === 0) {
    return <EmptyState title="No candidates at offer stage yet" description="Offer details show here once a candidate reaches Offer." />;
  }

  const current = candidates[0]!;
  const offer = current.offers[0] ?? null;
  const guaranteeEnd = current.placement?.guaranteeEndDate ?? null;
  const placementDate = current.placement?.startDate ?? current.placement?.placementDate ?? null;
  const now = new Date();
  const guaranteeProgress =
    guaranteeEnd && placementDate
      ? Math.min(100, Math.max(0, Math.round(((now.getTime() - placementDate.getTime()) / (guaranteeEnd.getTime() - placementDate.getTime())) * 100)))
      : null;
  const daysElapsed = placementDate ? Math.max(0, Math.round((now.getTime() - placementDate.getTime()) / (24 * 60 * 60 * 1000))) : null;
  const daysTotal = guaranteeEnd && placementDate ? Math.round((guaranteeEnd.getTime() - placementDate.getTime()) / (24 * 60 * 60 * 1000)) : null;

  return (
    <div className="flex flex-col gap-4">
      {candidates.map((row) => (
        <CandidateOfferCard key={row.id} row={row} />
      ))}

      {offer ? (
        <div className="flex flex-wrap items-start gap-4">
          <Card className="min-w-0 flex-[1_1_320px]">
            <CardContent className="flex flex-col gap-2 pt-4 text-sm">
              <h3 className="mb-1 text-[15px] font-medium">Package</h3>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                <dt className="text-[var(--color-muted)]">Base salary</dt>
                <dd>{offer.baseAmount ? formatMoney(offer.baseAmount, offer.baseCurrency) : ""}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                <dt className="text-[var(--color-muted)]">Bonus</dt>
                <dd>{offer.bonusPercentage ? `Up to ${offer.bonusPercentage}% of base` : offer.bonusAmount ? formatMoney(offer.bonusAmount, offer.baseCurrency) : ""}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                <dt className="text-[var(--color-muted)]">Equity</dt>
                <dd className="text-right">{offer.equityDetails ?? ""}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                <dt className="text-[var(--color-muted)]">Notice period</dt>
                <dd className="text-right">{offer.noticeConsiderations ?? ""}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] py-2">
                <dt className="text-[var(--color-muted)]">Start date</dt>
                <dd>{offer.proposedStartDate ? formatDate(offer.proposedStartDate) : ""}</dd>
              </div>
            </CardContent>
          </Card>
          {guaranteeEnd ? (
            <Card className="min-w-0 flex-[1_1_320px]">
              <CardContent className="flex flex-col gap-2 pt-4 text-sm">
                <h3 className="text-[15px] font-medium">Guarantee</h3>
                <p className="text-[13px] text-[var(--color-ink2)]">Guarantee ends {formatDate(guaranteeEnd)}</p>
                <p className="text-[13px] text-[var(--color-ink-subtle)]">If they leave before then, the search is reopened at no extra fee.</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-track)]">
                  <div className="h-1.5 rounded-full bg-[var(--color-ink)]" style={{ width: `${guaranteeProgress ?? 0}%` }} />
                </div>
                {daysElapsed !== null && daysTotal !== null ? (
                  <p className="text-xs text-[var(--color-muted)]">
                    {daysElapsed} of {daysTotal} days
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
