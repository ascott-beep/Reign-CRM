import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { formatMoney, initials, humanizeEnum } from "@/lib/utils";

describe("formatMoney", () => {
  it("formats a plain number as currency", () => {
    expect(formatMoney(190000, "GBP")).toBe("£190,000");
  });

  it("formats a Prisma Decimal without floating-point drift", () => {
    // 0.1 + 0.2 famously isn't 0.3 in binary floating point; Decimal must
    // round-trip through formatMoney exactly for money fields.
    const amount = new Decimal("129999.99").plus(new Decimal("0.01"));
    expect(amount.toString()).toBe("130000");
    expect(formatMoney(amount, "GBP")).toBe("£130,000");
  });

  it("returns an em dash for null/undefined/empty amounts", () => {
    expect(formatMoney(null, "GBP")).toBe("—");
    expect(formatMoney(undefined, "GBP")).toBe("—");
    expect(formatMoney("", "GBP")).toBe("—");
  });

  it("defaults to GBP when no currency is provided", () => {
    expect(formatMoney(1000, null)).toBe("£1,000");
  });
});

describe("initials", () => {
  it("builds two-letter uppercase initials", () => {
    expect(initials("laura", "bennett")).toBe("LB");
  });
});

describe("humanizeEnum", () => {
  it("title-cases snake case enum values", () => {
    expect(humanizeEnum("BOARD_OR_C_SUITE")).toBe("Board Or C Suite");
  });
  it("returns an em dash for empty input", () => {
    expect(humanizeEnum(null)).toBe("—");
  });
});
