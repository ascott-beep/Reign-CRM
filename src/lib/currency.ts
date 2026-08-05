import { CURRENCIES } from "@/lib/iso";

/**
 * Approximate GBP value of 1 unit of each currency — a manually maintained
 * fallback used only when a workspace hasn't set its own rates yet. No live
 * FX feed is wired up; admins should keep Settings > Workspace > Exchange
 * rates current for accurate report conversions.
 */
export const DEFAULT_EXCHANGE_RATES_TO_GBP: Record<string, number> = {
  GBP: 1,
  EUR: 0.86,
  USD: 0.79,
  CHF: 0.9,
  AED: 0.215,
  SAR: 0.21,
  SGD: 0.59,
  JPY: 0.0053,
  AUD: 0.52,
  CAD: 0.58,
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
