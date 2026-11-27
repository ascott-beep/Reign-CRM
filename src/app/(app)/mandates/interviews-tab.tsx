import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/states";
import { label } from "@/lib/labels";
import { formatInLondon, isBeforeTodayInLondon } from "@/lib/datetime";

type InterviewRow = {
  id: string;
  type: string;
  roundNumber: number;
  scheduledStart: Date;
  locationOrLink: string | null;
  outcome: string;
  candidateProcess: { candidatePerson: { firstName: string; lastName: string } };
  internalParticipants: { user: { firstName: string; lastName: string } }[];
  externalParticipants: { person: { firstName: string; lastName: string } }[];
};

const UPCOMING_OUTCOMES = new Set(["SCHEDULED"]);
const CANCELLED_OUTCOMES = new Set(["CANCELLED", "RESCHEDULED", "CANDIDATE_WITHDREW"]);

function statusTone(outcome: string): "success" | "warning" | "neutral" {
  if (UPCOMING_OUTCOMES.has(outcome)) return "success";
  if (CANCELLED_OUTCOMES.has(outcome)) return "neutral";
  if (outcome === "AWAITING_FEEDBACK") return "neutral";
  return "success";
}

function statusLabel(outcome: string): string {
  if (UPCOMING_OUTCOMES.has(outcome)) return "Confirmed";
  if (outcome === "CANCELLED") return "Cancelled";
  if (outcome === "RESCHEDULED") return "Rescheduled";
  if (outcome === "CANDIDATE_WITHDREW") return "Candidate withdrew";
  return "Done";
}

/** Round 4 screen 13 (R4MandateInterviews): feedback reads differently depending on timing, not just the raw outcome. */
function feedbackText(i: InterviewRow): { text: string; overdue: boolean } {
  if (UPCOMING_OUTCOMES.has(i.outcome)) return { text: "After the interview", overdue: false };
  if (i.outcome === "AWAITING_FEEDBACK") {
    return isBeforeTodayInLondon(i.scheduledStart) ? { text: "Client feedback overdue", overdue: true } : { text: "Awaiting feedback", overdue: false };
  }
  if (CANCELLED_OUTCOMES.has(i.outcome)) return { text: "", overdue: false };
  return { text: label(i.outcome), overdue: false };
}

function Row({ i }: { i: InterviewRow }) {
  const day = formatInLondon(i.scheduledStart, "EEE");
  const date = formatInLondon(i.scheduledStart, "d");
  const time = formatInLondon(i.scheduledStart, "HH:mm");
  const attendees = [...i.internalParticipants.map((p) => `${p.user.firstName} ${p.user.lastName}`), ...i.externalParticipants.map((p) => `${p.person.firstName} ${p.person.lastName}`)];
  const feedback = feedbackText(i);

  return (
    <div className="flex items-center gap-4 border-t border-[var(--color-line)] py-3 first:border-t-0">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-[6px] bg-[var(--color-sunk)] py-1.5 text-center">
        <span className="text-[10.5px] uppercase tracking-wide text-[var(--color-muted)]">{day}</span>
        <span className="text-base font-semibold leading-none text-[var(--color-ink)]">{date}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-ink)]">
          {i.candidateProcess.candidatePerson.firstName} {i.candidateProcess.candidatePerson.lastName} · {ordinalRound(i.roundNumber)} interview
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-ink-subtle)]">
          {time}
          {i.locationOrLink ? ` · ${i.locationOrLink}` : ""}
          {attendees.length > 0 ? ` · with ${attendees.join(" and ")}` : ""}
        </p>
      </div>
      <Badge tone={statusTone(i.outcome)}>{statusLabel(i.outcome)}</Badge>
      <span className={`w-48 shrink-0 text-right text-[13px] ${feedback.overdue ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]"}`}>{feedback.text}</span>
    </div>
  );
}

function ordinalRound(n: number): string {
  if (n === 1) return "First";
  if (n === 2) return "Second";
  if (n === 3) return "Third";
  return `Round ${n}`;
}

export function InterviewsTab({ interviews }: { interviews: InterviewRow[] }) {
  const now = new Date();
  const upcoming = interviews.filter((i) => UPCOMING_OUTCOMES.has(i.outcome) && i.scheduledStart >= now).sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
  const past = interviews
    .filter((i) => !(UPCOMING_OUTCOMES.has(i.outcome) && i.scheduledStart >= now))
    .sort((a, b) => b.scheduledStart.getTime() - a.scheduledStart.getTime());

  if (interviews.length === 0) {
    return <EmptyState title="No interviews scheduled" description="Schedule one from a candidate's row to see it here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-1 text-sm font-semibold">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="py-2 text-sm text-[var(--color-ink-subtle)]">Nothing scheduled.</p>
          ) : (
            upcoming.map((i) => <Row key={i.id} i={i} />)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-1 text-sm font-semibold">Past</h3>
          {past.length === 0 ? <p className="py-2 text-sm text-[var(--color-ink-subtle)]">No past interviews yet.</p> : past.map((i) => <Row key={i.id} i={i} />)}
        </CardContent>
      </Card>
    </div>
  );
}
