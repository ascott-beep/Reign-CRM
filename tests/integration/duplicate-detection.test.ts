import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { findOrganizationDuplicates, findPersonDuplicates } from "@/lib/duplicates";
import { normalizeName, normalizeWebsiteDomain } from "@/lib/normalize";
import { prisma, createTestWorkspaceAndUser } from "./setup";

describe("organisation duplicate detection", () => {
  let workspaceId: string;
  let userId: string;

  beforeAll(async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();
    workspaceId = workspace.id;
    userId = user.id;

    await prisma.organization.create({
      data: {
        workspaceId,
        name: "Ashcombe Capital Partners",
        normalizedName: normalizeName("Ashcombe Capital Partners"),
        type: "PE_FUND",
        status: "ACTIVE_CLIENT",
        website: "https://www.ashcombecapital.com",
        normalizedWebsiteDomain: normalizeWebsiteDomain("https://www.ashcombecapital.com"),
        createdById: userId,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("flags an exact website-domain match", async () => {
    const duplicates = await findOrganizationDuplicates(workspaceId, {
      name: "Ashcombe Capital Partners LLP",
      website: "https://ashcombecapital.com/about",
    });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]!.reason).toBe("Same website domain");
  });

  it("flags a fuzzy name match even without a matching website", async () => {
    const duplicates = await findOrganizationDuplicates(workspaceId, { name: "Ashcombe Capital Partnrs" });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]!.reason).toBe("Similar name");
  });

  it("does not flag a genuinely distinct organisation", async () => {
    const duplicates = await findOrganizationDuplicates(workspaceId, { name: "Totally Different Widgets Ltd", website: "widgetsco.example" });
    expect(duplicates.length).toBe(0);
  });

  it("excludes the record itself when editing", async () => {
    const org = await prisma.organization.findFirstOrThrow({ where: { workspaceId, name: "Ashcombe Capital Partners" } });
    const duplicates = await findOrganizationDuplicates(workspaceId, { name: "Ashcombe Capital Partners", website: "https://www.ashcombecapital.com" }, org.id);
    expect(duplicates.length).toBe(0);
  });
});

describe("person duplicate detection", () => {
  let workspaceId: string;
  let userId: string;

  beforeAll(async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();
    workspaceId = workspace.id;
    userId = user.id;

    await prisma.person.create({
      data: {
        workspaceId,
        firstName: "Laura",
        lastName: "Bennett",
        primaryEmail: "laura.bennett@example.com",
        personTypes: ["CANDIDATE"],
        createdById: userId,
      },
    });
  });

  it("flags an exact email match", async () => {
    const duplicates = await findPersonDuplicates(workspaceId, { firstName: "L.", lastName: "Bennett-Smith", primaryEmail: "Laura.Bennett@Example.com" });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]!.reason).toBe("Same email address");
  });

  it("flags a near-miss surname spelling via the fuzzy-name pass", async () => {
    const duplicates = await findPersonDuplicates(workspaceId, { firstName: "Laura", lastName: "Bennet" });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]!.reason).toBe("Similar name");
  });

  it("does not flag an unrelated person", async () => {
    const duplicates = await findPersonDuplicates(workspaceId, { firstName: "Someone", lastName: "Completely-Different", primaryEmail: "nobody@nowhere.example" });
    expect(duplicates.length).toBe(0);
  });
});
