/** Shared normalisation helpers used by both the app and the seed script for duplicate detection. */

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,'"()]/g, "")
    .replace(/\b(ltd|limited|inc|incorporated|llc|llp|plc|gmbh|sa|nv|bv|corp|corporation|co|grp|group)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWebsiteDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return website.toLowerCase().replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/** Cheap trigram-free similarity check for in-app "did you mean" prompts (Postgres does the heavy lifting via pg_trgm at query time). */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  const distance = matrix[a.length]![b.length]!;
  return 1 - distance / Math.max(a.length, b.length);
}
