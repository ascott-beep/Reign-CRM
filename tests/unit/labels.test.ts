import { describe, it, expect } from "vitest";
import { label, statusTone, OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";

describe("label", () => {
  it("shows full descriptive labels instead of raw enum names", () => {
    expect(label("A_STRONG")).toBe("A — Strong");
    expect(label("NOT_RATED")).toBe("Not Rated");
    expect(label("PE_FUND")).toBe("PE Fund");
  });

  it("falls back to humanized title-case for values without an override", () => {
    expect(label("FUND_OF_FUNDS_LIKE_VALUE")).toBe("Fund Of Funds Like Value");
  });

  it("returns an em dash for missing values", () => {
    expect(label(null)).toBe("—");
    expect(label(undefined)).toBe("—");
  });
});

describe("statusTone", () => {
  it("maps positive statuses to success", () => {
    expect(statusTone("ACTIVE_CLIENT")).toBe("success");
    expect(statusTone("WON")).toBe("success");
  });
  it("maps negative statuses to danger", () => {
    expect(statusTone("LOST")).toBe("danger");
    expect(statusTone("DO_NOT_CONTACT")).toBe("danger");
  });
  it("defaults to neutral for unknown values", () => {
    expect(statusTone("SOMETHING_UNKNOWN")).toBe("neutral");
  });
});

describe("OPPORTUNITY_STAGE_PROBABILITY", () => {
  it("matches the spec's default probabilities exactly", () => {
    expect(OPPORTUNITY_STAGE_PROBABILITY).toMatchObject({
      SIGNAL_IDENTIFIED: 5,
      CONTACT_IDENTIFIED: 10,
      CONTACTED: 15,
      DISCOVERY_ARRANGED: 25,
      QUALIFIED: 40,
      PROPOSAL_OR_TERMS: 65,
      WON: 100,
      LOST: 0,
    });
  });
});
