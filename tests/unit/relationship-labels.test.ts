import { describe, it, expect } from "vitest";
import { forwardRelationshipLabel, inverseRelationshipLabel } from "@/lib/relationship-labels";

describe("organisation relationship inverse display", () => {
  it("shows the fund's investor role from the fund's own page (forward)", () => {
    expect(forwardRelationshipLabel("CURRENT_INVESTOR_IN")).toBe("Current investor in");
  });

  it("shows the portfolio company's role from the fund's page correctly inverted", () => {
    // If Fund A is CURRENT_INVESTOR_IN Company B, Company B's page must show
    // Fund A as a "Current investor" without a duplicate inverse DB row.
    expect(inverseRelationshipLabel("CURRENT_INVESTOR_IN")).toBe("Current investor");
  });

  it("inverts parent/subsidiary correctly", () => {
    expect(forwardRelationshipLabel("PARENT_OF")).toBe("Parent of");
    expect(inverseRelationshipLabel("PARENT_OF")).toBe("Subsidiary of");
    expect(forwardRelationshipLabel("SUBSIDIARY_OF")).toBe("Subsidiary of");
    expect(inverseRelationshipLabel("SUBSIDIARY_OF")).toBe("Parent company");
  });

  it("keeps symmetric relationship types identical from both sides", () => {
    expect(forwardRelationshipLabel("CO_INVESTOR_WITH")).toBe(inverseRelationshipLabel("CO_INVESTOR_WITH"));
    expect(forwardRelationshipLabel("PARTNER_OF")).toBe(inverseRelationshipLabel("PARTNER_OF"));
  });
});
