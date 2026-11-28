/**
 * ISO 3166-1 alpha-2 countries (subset covering common CRM usage — not exhaustive of all 249).
 * Round 5 Part A item 14: United Kingdom first, then DACH, then Benelux, then everything
 * else A to Z by name. countryOptions() below is what the UI should actually render from,
 * since it keeps this order (a plain alphabetical sort would scatter UK/DACH/Benelux).
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "GB", name: "United Kingdom" },
  // DACH
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  // Benelux
  { code: "BE", name: "Belgium" },
  { code: "NL", name: "Netherlands" },
  { code: "LU", name: "Luxembourg" },
  // Everything else, A to Z by name
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "HK", name: "Hong Kong" },
  { code: "IN", name: "India" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MX", name: "Mexico" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
];

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/** ISO 4217 currency codes — section 9.6 trims this to the four the business actually uses. */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "AED", name: "UAE Dirham" },
];

export const COMMON_CURRENCY_CODES = ["GBP", "EUR", "USD"];
