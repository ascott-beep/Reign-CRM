/** ISO 3166-1 alpha-2 countries (subset covering common CRM usage — not exhaustive of all 249). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "IE", name: "Ireland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "LU", name: "Luxembourg" },
  { code: "CH", name: "Switzerland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "JP", name: "Japan" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "IN", name: "India" },
  { code: "ZA", name: "South Africa" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "CN", name: "China" },
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
