import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/labels";
import { formatShortDate, isBeforeTodayInLondon } from "@/lib/datetime";
import { TaskCheckbox } from "./task-checkbox";
import type { TaskWithLinks } from "./page";

export function linkedRecordText(t: TaskWithLinks): string | null {
  if (t.mandates[0]) return `${t.mandates[0].mandate.hiringOrganization.name} · ${t.mandates[0].mandate.title}`;
  if (t.candidateProcesses[0]) {
    const p = t.candidateProcesses[0].candidateProcess;
    return `${p.candidatePerson.firstName} ${p.candidatePerson.lastName} · ${p.mandate.title}`;
  }
  if (t.opportunities[0]) return t.opportunities[0].opportunity.name;
  if (t.organizations[0]) return t.organizations[0].organization.name;
  if (t.people[0]) return `${t.people[0].person.firstName} ${t.people[0].person.lastName}`;
  if (t.intelligenceItems[0]) return t.intelligenceItems[0].intelligenceItem.title;
  return null;
}

export function TaskRow({ t, completed, onToggle }: { t: TaskWithLinks; completed: boolean; onToggle: (completed: boolean) => void }) {
  const overdue = !completed && t.status !== "CANCELLED" && isBeforeTodayInLondon(t.dueDate);
  const linked = linkedRecordText(t);
  return (
    <div className="flex items-center gap-4 border-t border-[var(--color-line)] px-5 py-3 text-[13.5px]">
      <TaskCheckbox taskId={t.id} completed={completed} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <div className={completed ? "truncate text-[var(--color-muted)] line-through" : "truncate text-[var(--color-ink)]"}>{t.title}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
          {label(t.type)}
          {linked ? ` · ${linked}` : null}
          {!linked ? <span className="text-[var(--color-warn)]"> · No linked record · add detail</span> : null}
        </div>
      </div>
      <div className={`w-32 shrink-0 text-right text-[13px] ${overdue ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]"}`}>
        {overdue ? "Overdue · " : ""}
        {formatShortDate(t.dueDate)}
      </div>
      <div className="w-20 shrink-0 text-right">
        <Badge tone={t.priority === "URGENT" ? "warning" : "neutral"}>{label(t.priority)}</Badge>
      </div>
    </div>
  );
}
