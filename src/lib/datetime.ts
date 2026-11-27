import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Round 4 Part A item 5 (React error #418, hydration): every date must render
 * the same string on the server and in the browser, whatever timezone either
 * machine is actually set to. Pin everything to UK time (ground rule 5) with
 * one shared helper instead of calling date-fns' format() directly, which
 * uses each environment's own local timezone and so can disagree between
 * server and client.
 */
const LONDON = "Europe/London";

export function formatInLondon(date: Date | string | number, pattern: string): string {
  return formatInTimeZone(date, LONDON, pattern);
}

/** "27 Nov 2026" */
export function formatDate(date: Date | string | number): string {
  return formatInLondon(date, "d MMM yyyy");
}

/** "27 Nov" */
export function formatShortDate(date: Date | string | number): string {
  return formatInLondon(date, "d MMM");
}

/** "27 November 2026" */
export function formatLongDate(date: Date | string | number): string {
  return formatInLondon(date, "d MMMM yyyy");
}

/** "Nov 2026" */
export function formatMonthYear(date: Date | string | number): string {
  return formatInLondon(date, "MMM yyyy");
}

/** "14:05" */
export function formatTime(date: Date | string | number): string {
  return formatInLondon(date, "HH:mm");
}

/** "27 Nov 2026 14:05" */
export function formatDateTime(date: Date | string | number): string {
  return formatInLondon(date, "d MMM yyyy HH:mm");
}

/** "27 Nov 2026, 14:05" */
export function formatDateTimeComma(date: Date | string | number): string {
  return formatInLondon(date, "d MMM yyyy, HH:mm");
}

/** "Friday" */
export function formatWeekday(date: Date | string | number): string {
  return formatInLondon(date, "EEEE");
}

/** "Friday 27 November" */
export function formatWeekdayDate(date: Date | string | number): string {
  return formatInLondon(date, "EEEE d MMMM");
}

function londonDayKey(date: Date | string | number): string {
  return formatInLondon(date, "yyyy-MM-dd");
}

/**
 * date-fns' own isToday()/isYesterday() read the *system's* local timezone,
 * which is exactly the server-vs-browser mismatch causing the hydration
 * error this helper file exists to fix. These compare London calendar-date
 * strings instead, which formatInTimeZone computes the same way regardless
 * of which machine runs it.
 */
export function isTodayInLondon(date: Date | string | number): boolean {
  return londonDayKey(date) === londonDayKey(new Date());
}

export function isYesterdayInLondon(date: Date | string | number): boolean {
  const todayUtcMidnight = new Date(`${londonDayKey(new Date())}T00:00:00Z`);
  const yesterdayUtcMidnight = new Date(todayUtcMidnight.getTime() - 24 * 60 * 60 * 1000);
  return londonDayKey(date) === yesterdayUtcMidnight.toISOString().slice(0, 10);
}

/** True if the given date's London calendar day is strictly before today's -- i.e. overdue. */
export function isBeforeTodayInLondon(date: Date | string | number): boolean {
  return londonDayKey(date) < londonDayKey(new Date());
}

/** Midnight today, as a UTC instant -- safe to use directly in a Prisma date filter. */
export function startOfTodayInLondon(): Date {
  return fromZonedTime(`${londonDayKey(new Date())} 00:00:00`, LONDON);
}

export function endOfTodayInLondon(): Date {
  return new Date(startOfTodayInLondon().getTime() + 24 * 60 * 60 * 1000);
}

/** Midnight on 1 Jan of the given date's London year, as a UTC instant -- safe for a Prisma date filter. */
export function startOfYearInLondon(date: Date | string | number = new Date()): Date {
  const year = formatInLondon(date, "yyyy");
  return fromZonedTime(`${year}-01-01 00:00:00`, LONDON);
}

/** The current hour (0-23) in UK time, for time-of-day greetings etc. -- not the executing machine's own local hour. */
export function currentHourInLondon(): number {
  return Number(formatInLondon(new Date(), "H"));
}

/** Midnight on the Sunday that starts the given date's London week, as a UTC instant. */
export function startOfWeekInLondon(date: Date | string | number = new Date()): Date {
  const isoDay = Number(formatInLondon(date, "i")); // Mon=1 ... Sun=7
  const daysSinceSunday = isoDay % 7; // Sun=0, Mon=1, ... Sat=6
  const startOfThatDay = fromZonedTime(`${londonDayKey(date)} 00:00:00`, LONDON);
  return new Date(startOfThatDay.getTime() - daysSinceSunday * 24 * 60 * 60 * 1000);
}
