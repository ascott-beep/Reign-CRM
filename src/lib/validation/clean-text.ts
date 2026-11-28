/**
 * Round 5 Part A item 13 — strips em/en dashes from free-text input on
 * save, replacing them with " · " (same convention as the no-dash rule for
 * source code), so new dashes can't creep back into stored data the way the
 * one-off backfill (prisma/backfill-clean-dashes.ts) had to clean up.
 */
const DASH_RE = /\s*[—–]\s*/g;

export function cleanDashes(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(DASH_RE, " · ").replace(/ {2,}/g, " ");
}
