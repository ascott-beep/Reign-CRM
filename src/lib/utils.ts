import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatMoney(
  amount: number | string | { toString(): string } | null | undefined,
  currency: string | null | undefined,
) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const numeric = typeof amount === "number" ? amount : Number(amount.toString());
  if (Number.isNaN(numeric)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "GBP",
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currency ?? ""} ${numeric.toLocaleString()}`.trim();
  }
}

/** Section 9.6 — prefixes a converted total with "≈" so it reads as an estimate, not an exact figure. */
export function formatConvertedMoney(amount: number, approx: boolean, currency: string) {
  return `${approx ? "≈" : ""}${formatMoney(amount, currency)}`;
}

export function humanizeEnum(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
