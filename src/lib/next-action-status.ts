import { isBeforeTodayInLondon } from "./datetime";

export type NextActionStatus = "overdue" | "scheduled" | "none";

/**
 * SPEC.md section 5: red if the next open task is overdue, green if due
 * today or later (future-dated actions count as green, the open question
 * in SPEC.md section 8 on this is resolved as "yes"), grey if there is no
 * open task at all. "Today" is always today in UK time (Round 4 ground
 * rule 5), not the server or browser's own local timezone.
 */
export function nextActionStatus(dueDate: Date | string | null | undefined): NextActionStatus {
  if (!dueDate) return "none";
  return isBeforeTodayInLondon(dueDate) ? "overdue" : "scheduled";
}
