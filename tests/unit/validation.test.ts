import { describe, it, expect } from "vitest";
import { organizationFormSchema } from "@/lib/validation/organization";
import { personFormSchema } from "@/lib/validation/person";
import { opportunityFormSchema, stageChangeSchema, defaultProbabilityFor } from "@/lib/validation/opportunity";
import { mandateFormSchema } from "@/lib/validation/mandate";
import { processStageChangeSchema } from "@/lib/validation/candidate-process";

describe("organizationFormSchema", () => {
  it("rejects a missing name", () => {
    const result = organizationFormSchema.safeParse({ type: "PE_FUND", status: "RESEARCH" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid enum type", () => {
    const result = organizationFormSchema.safeParse({ name: "Acme", type: "NOT_A_TYPE" });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid organisation", () => {
    const result = organizationFormSchema.safeParse({ name: "Acme Capital", type: "PE_FUND", status: "RESEARCH" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed website URL", () => {
    const result = organizationFormSchema.safeParse({ name: "Acme", type: "PE_FUND", website: "not a url" });
    expect(result.success).toBe(false);
  });
});

describe("personFormSchema", () => {
  it("accepts no person type when personCategory is set instead (Round 5 Part D's 'Who are they')", () => {
    const result = personFormSchema.safeParse({ firstName: "Jane", lastName: "Doe", personTypes: [], personCategory: "CANDIDATE" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = personFormSchema.safeParse({ firstName: "Jane", lastName: "Doe", personTypes: ["CANDIDATE"], primaryEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid candidate", () => {
    const result = personFormSchema.safeParse({ firstName: "Jane", lastName: "Doe", personTypes: ["CANDIDATE"], primaryEmail: "jane@example.com" });
    expect(result.success).toBe(true);
  });
});

describe("opportunityFormSchema", () => {
  it("requires a hiring organisation", () => {
    const result = opportunityFormSchema.safeParse({ name: "New Search", ownerId: "user_1" });
    expect(result.success).toBe(false);
  });
});

describe("stageChangeSchema + defaultProbabilityFor", () => {
  it("parses a valid stage change payload", () => {
    const result = stageChangeSchema.safeParse({ opportunityId: "opp_1", toStage: "QUALIFIED" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid stage", () => {
    const result = stageChangeSchema.safeParse({ opportunityId: "opp_1", toStage: "NOT_A_STAGE" });
    expect(result.success).toBe(false);
  });

  it("uses workspace overrides when provided, falling back to the default table", () => {
    expect(defaultProbabilityFor("QUALIFIED")).toBe(40);
    expect(defaultProbabilityFor("QUALIFIED", { QUALIFIED: 55 })).toBe(55);
    expect(defaultProbabilityFor("QUALIFIED", null)).toBe(40);
  });
});

describe("mandateFormSchema", () => {
  it("requires a hiring organisation and defaults numberOfHires to 1", () => {
    const result = mandateFormSchema.safeParse({ title: "CFO Search", hiringOrganizationId: "org_1", ownerId: "user_1" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.numberOfHires).toBe(1);
  });

  it("rejects a missing hiring organisation", () => {
    const result = mandateFormSchema.safeParse({ title: "CFO Search", ownerId: "user_1" });
    expect(result.success).toBe(false);
  });
});

describe("processStageChangeSchema", () => {
  it("parses a rejection with reason", () => {
    const result = processStageChangeSchema.safeParse({ candidateProcessId: "cp_1", toStage: "REJECTED", rejectionReason: "SENIORITY" });
    expect(result.success).toBe(true);
  });
});
