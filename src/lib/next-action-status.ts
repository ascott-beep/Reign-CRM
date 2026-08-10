import { isPast, isToday, startOfDay } from "date-fns";

export type NextActionStatus = "overdue" | "today" | "none";

/** "none" also covers a next action scheduled for a future date — only today/overdue get a called-out colour. */
export function nextActionStatus(dueDate: Date | string | null | undefined): NextActionStatus {
  if (!dueDate) return "none";
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isToday(date)) return "today";
  if (isPast(startOfDay(date))) return "overdue";
  return "none";
}
