import { startOfDay } from "date-fns";

export type NextActionStatus = "overdue" | "scheduled" | "none";

/**
 * SPEC.md section 5: red if the next open task is overdue, green if due
 * today or later (future-dated actions count as green — the open question
 * in SPEC.md section 8 on this is resolved as "yes"), grey if there is no
 * open task at all.
 */
export function nextActionStatus(dueDate: Date | string | null | undefined): NextActionStatus {
  if (!dueDate) return "none";
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return date < startOfDay(new Date()) ? "overdue" : "scheduled";
}
