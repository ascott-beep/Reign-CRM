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
  if (amount === null || amount === undefined || amount === "") return "";
  const numeric = typeof amount === "number" ? amount : Number(amount.toString());
  if (Number.isNaN(numeric)) return "";
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

/**
 * Round 5 Part A item 2 — no "≈" or "~" before a converted amount; the fact
 * that it is converted is said in the nearby label ("in EUR") instead, via
 * convertedLabel() below.
 */
export function formatConvertedMoney(amount: number, _approx: boolean, currency: string) {
  return formatMoney(amount, currency);
}

/** Appends "in {currency}" to a label when the figure next to it is a converted total. */
export function convertedLabel(label: string, approx: boolean, currency: string) {
  return approx ? `${label} in ${currency}` : label;
}

export function humanizeEnum(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
