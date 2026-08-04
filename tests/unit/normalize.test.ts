import { describe, it, expect } from "vitest";
import { normalizeName, normalizeWebsiteDomain, normalizeEmail, levenshteinSimilarity } from "@/lib/normalize";

describe("normalizeName", () => {
  it("lowercases and strips legal suffixes", () => {
    expect(normalizeName("Acme Capital Ltd")).toBe("acme capital");
    expect(normalizeName("Acme Capital Limited")).toBe("acme capital");
    expect(normalizeName("Acme, Inc.")).toBe("acme");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("  Acme    Capital  ")).toBe("acme capital");
  });
});

describe("normalizeWebsiteDomain", () => {
  it("strips protocol and www", () => {
    expect(normalizeWebsiteDomain("https://www.acmecapital.com")).toBe("acmecapital.com");
    expect(normalizeWebsiteDomain("http://acmecapital.com/about")).toBe("acmecapital.com");
  });

  it("handles bare domains without a protocol", () => {
    expect(normalizeWebsiteDomain("acmecapital.com")).toBe("acmecapital.com");
  });

  it("returns null for empty input", () => {
    expect(normalizeWebsiteDomain(null)).toBeNull();
    expect(normalizeWebsiteDomain(undefined)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });
  it("returns null for empty input", () => {
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe("levenshteinSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(levenshteinSimilarity("laura bennett", "laura bennett")).toBe(1);
  });
  it("returns a high score for near-miss spellings", () => {
    const score = levenshteinSimilarity("laura bennett", "laura bennet");
    expect(score).toBeGreaterThan(0.9);
  });
  it("returns a low score for unrelated strings", () => {
    const score = levenshteinSimilarity("laura bennett", "michael tan");
    expect(score).toBeLessThan(0.4);
  });
});
