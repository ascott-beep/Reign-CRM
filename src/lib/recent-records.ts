"use client";

/**
 * Round 4 screen 01 (R4AskOpen) "then 3 recent records" -- per-browser, not
 * stored server-side (nothing here is sensitive, and it saves a schema
 * change for a pure convenience feature). RecordViewTracker pushes to this
 * on every record page; the Ask AI panel's empty state reads the latest 3.
 */

export type RecentRecordType = "person" | "organization" | "opportunity" | "mandate";

export type RecentRecord = {
  type: RecentRecordType;
  id: string;
  label: string;
  meta: string;
  href: string;
  viewedAt: number;
};

const KEY = "atlas:recent-records";
const MAX = 10;

function read(): RecentRecord[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRecentRecord(entry: Omit<RecentRecord, "viewedAt">) {
  try {
    const existing = read().filter((r) => !(r.type === entry.type && r.id === entry.id));
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage can throw in private browsing / blocked storage -- recent records are a convenience, never worth failing the page over.
  }
}

export function getRecentRecords(limit = 3): RecentRecord[] {
  return read().slice(0, limit);
}
