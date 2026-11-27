"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";

/** Round 4 ground rule 6: only these four currencies are supported anywhere money is entered or shown. */
const SUPPORTED_CURRENCIES = ["GBP", "USD", "EUR", "AED"];

/** Exported for controlled callers (e.g. a dialog building its own FormData) that format a raw numeric string themselves. */
export function formatMoneyAsTyped(raw: string, currency: string): string {
  if (!raw) return "";
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) return "";
  const safeCurrency = SUPPORTED_CURRENCIES.includes(currency) ? currency : "GBP";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: safeCurrency, maximumFractionDigits: 0 }).format(numeric);
  } catch {
    return `${safeCurrency} ${numeric.toLocaleString("en-GB")}`;
  }
}

/**
 * Round 4 ground rule 6: "always show currency + thousands separators
 * as-you-type (e.g. £38,000)." The visible field shows the live-formatted
 * value; a hidden input alongside it carries the plain numeric string so
 * server actions keep parsing a plain amount, unchanged.
 */
export function MoneyInput({
  name,
  id,
  currency,
  defaultValue,
  placeholder,
  className,
  disabled,
}: {
  name: string;
  id?: string;
  /** e.g. the sibling currency <Select>'s current value. Falls back to GBP if not one of the four supported currencies. */
  currency: string | null | undefined;
  defaultValue?: string | number | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [raw, setRaw] = useState(defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : "");

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={formatMoneyAsTyped(raw, currency ?? "GBP")}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          setRaw(digits ? String(Number(digits)) : "");
        }}
        className={className}
      />
    </>
  );
}
