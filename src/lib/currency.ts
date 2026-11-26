import { CURRENCIES } from "@/lib/iso";

/**
 * Approximate GBP value of 1 unit of each currency — a manually maintained
 * fallback used only when a workspace hasn't set its own rates yet. No live
 * FX feed is wired up; admins should keep Settings > Workspace > Exchange
 * rates current for accurate report conversions.
 */
export const DEFAULT_EXCHANGE_RATES_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
  AED: 0.215,
};

export function normalizeExchangeRates(raw: unknown): Record<string, number> {
  const rates = { ...DEFAULT_EXCHANGE_RATES_TO_GBP };
  if (raw && typeof raw === "object") {
    for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) rates[code] = numeric;
    }
  }
  return rates;
}

/** Converts an amount between currencies via GBP as a pivot. Falls back to 1:1 for unknown codes. */
export function convertAmount(amount: number, from: string, to: string, ratesToGbp: Record<string, number>): number {
  if (from === to) return amount;
  const fromRate = ratesToGbp[from] ?? 1;
  const toRate = ratesToGbp[to] ?? 1;
  const inGbp = amount * fromRate;
  return inGbp / toRate;
}

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

/**
 * Converts and sums a set of amounts (each in their own currency) into a
 * single display currency. `approx` is true whenever any item needed
 * converting — section 9.6: "totals convert and show '≈'".
 */
export function convertedTotal(
  items: { amount: number; currency: string | null | undefined }[],
  displayCurrency: string,
  ratesToGbp: Record<string, number>,
): { amount: number; approx: boolean } {
  let amount = 0;
  let approx = false;
  for (const item of items) {
    const from = item.currency ?? displayCurrency;
    if (from !== displayCurrency) approx = true;
    amount += convertAmount(item.amount, from, displayCurrency, ratesToGbp);
  }
  return { amount, approx };
}
