import { describe, it, expect, beforeAll } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma, createTestWorkspaceAndUser, uniqueSlug } from "./setup";

describe("candidate process uniqueness (one row per candidate x mandate)", () => {
  it("rejects a second candidate_process for the same mandate + candidate pair", async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();

    const org = await prisma.organization.create({
      data: { workspaceId: workspace.id, name: "Test Portfolio Co", normalizedName: "test portfolio co", type: "PORTFOLIO_COMPANY", createdById: user.id },
    });
    const mandate = await prisma.mandate.create({
      data: {
        workspaceId: workspace.id,
        reference: uniqueSlug("R-TEST"),
        title: "Test Mandate",
        hiringOrganizationId: org.id,
        ownerId: user.id,
        createdById: user.id,
      },
    });
    const candidate = await prisma.person.create({
      data: { workspaceId: workspace.id, firstName: "Cand", lastName: "One", personTypes: ["CANDIDATE"], createdById: user.id },
    });

    await prisma.candidateProcess.create({
      data: { workspaceId: workspace.id, mandateId: mandate.id, candidatePersonId: candidate.id, addedById: user.id, ownerId: user.id },
    });

    await expect(
      prisma.candidateProcess.create({
        data: { workspaceId: workspace.id, mandateId: mandate.id, candidatePersonId: candidate.id, addedById: user.id, ownerId: user.id },
      }),
    ).rejects.toThrow();
  });
});

describe("opportunity stage history", () => {
  it("accumulates an immutable append-only history as stage changes", async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();
    const org = await prisma.organization.create({
      data: { workspaceId: workspace.id, name: "Stage History Co", normalizedName: "stage history co", type: "PORTFOLIO_COMPANY", createdById: user.id },
    });
    const opportunity = await prisma.opportunity.create({
      data: { workspaceId: workspace.id, name: "Test Opportunity", hiringOrganizationId: org.id, ownerId: user.id, createdById: user.id, stage: "SIGNAL_IDENTIFIED" },
    });
    await prisma.opportunityStageHistory.create({ data: { opportunityId: opportunity.id, toStage: "SIGNAL_IDENTIFIED", changedById: user.id } });

    for (const stage of ["CONTACT_IDENTIFIED", "CONTACTED", "QUALIFIED"] as const) {
      const before = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage } });
      await prisma.opportunityStageHistory.create({ data: { opportunityId: opportunity.id, fromStage: before.stage, toStage: stage, changedById: user.id } });
    }

    const history = await prisma.opportunityStageHistory.findMany({ where: { opportunityId: opportunity.id }, orderBy: { changedAt: "asc" } });
    expect(history.map((h) => h.toStage)).toEqual(["SIGNAL_IDENTIFIED", "CONTACT_IDENTIFIED", "CONTACTED", "QUALIFIED"]);
    expect(history[0]!.fromStage).toBeNull();
    expect(history[3]!.fromStage).toBe("CONTACTED");
  });
});

describe("off-limits BLOCK vs WARNING severity", () => {
  let workspaceId: string;
  let userId: string;
  let blockedOrgId: string;
  let warnedOrgId: string;

  beforeAll(async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();
    workspaceId = workspace.id;
    userId = user.id;

    const blockedOrg = await prisma.organization.create({
      data: { workspaceId, name: "Blocked Co", normalizedName: "blocked co", type: "PORTFOLIO_COMPANY", createdById: userId },
    });
    const warnedOrg = await prisma.organization.create({
      data: { workspaceId, name: "Warned Co", normalizedName: "warned co", type: "PORTFOLIO_COMPANY", createdById: userId },
    });
    blockedOrgId = blockedOrg.id;
    warnedOrgId = warnedOrg.id;

    await prisma.offLimitsRestriction.create({
      data: { workspaceId, organizationId: blockedOrgId, type: "PLACEMENT_GUARANTEE", severity: "BLOCK", reason: "Recent placement guarantee", createdById: userId },
    });
    await prisma.offLimitsRestriction.create({
      data: { workspaceId, organizationId: warnedOrgId, type: "ACTIVE_CLIENT", severity: "WARNING", reason: "Active client", createdById: userId },
    });
  });

  it("finds an active BLOCK restriction for a blocked organisation", async () => {
    const restrictions = await prisma.offLimitsRestriction.findMany({ where: { workspaceId, organizationId: blockedOrgId } });
    const now = new Date();
    const active = restrictions.filter((r) => (r.activeOverride ?? (!r.endDate || r.endDate > now)) && r.startDate <= now);
    expect(active.some((r) => r.severity === "BLOCK")).toBe(true);
  });

  it("finds only a WARNING (not BLOCK) for the warned organisation", async () => {
    const restrictions = await prisma.offLimitsRestriction.findMany({ where: { workspaceId, organizationId: warnedOrgId } });
    expect(restrictions.some((r) => r.severity === "BLOCK")).toBe(false);
    expect(restrictions.some((r) => r.severity === "WARNING")).toBe(true);
  });

  it("treats a restriction with a past end date as inactive", async () => {
    const org = await prisma.organization.create({
      data: { workspaceId, name: "Expired Restriction Co", normalizedName: "expired restriction co", type: "PORTFOLIO_COMPANY", createdById: userId },
    });
    await prisma.offLimitsRestriction.create({
      data: {
        workspaceId,
        organizationId: org.id,
        type: "PLACEMENT_GUARANTEE",
        severity: "BLOCK",
        reason: "Guarantee period now over",
        startDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdById: userId,
      },
    });
    const restrictions = await prisma.offLimitsRestriction.findMany({ where: { workspaceId, organizationId: org.id } });
    const now = new Date();
    const active = restrictions.filter((r) => (r.activeOverride ?? (!r.endDate || r.endDate > now)) && r.startDate <= now);
    expect(active.length).toBe(0);
  });
});

describe("currency handling without floating-point errors", () => {
  it("stores and retrieves exact decimal amounts through Postgres numeric columns", async () => {
    const { workspace, user } = await createTestWorkspaceAndUser();
    const org = await prisma.organization.create({
      data: { workspaceId: workspace.id, name: "Money Co", normalizedName: "money co", type: "PORTFOLIO_COMPANY", createdById: user.id },
    });
    const mandate = await prisma.mandate.create({
      data: {
        workspaceId: workspace.id,
        reference: uniqueSlug("R-MONEY"),
        title: "Money Mandate",
        hiringOrganizationId: org.id,
        ownerId: user.id,
        createdById: user.id,
        minBaseAmount: new Decimal("129999.99"),
        maxBaseAmount: new Decimal("150000.01"),
        feePercentage: new Decimal("27.5"),
      },
    });

    const reloaded = await prisma.mandate.findUniqueOrThrow({ where: { id: mandate.id } });
    expect(reloaded.minBaseAmount?.toString()).toBe("129999.99");
    expect(reloaded.maxBaseAmount?.toString()).toBe("150000.01");
    expect(reloaded.feePercentage?.toString()).toBe("27.5");

    // Sum three decimals that would drift under IEEE-754 floating point.
    const sum = new Decimal("0.1").plus(new Decimal("0.2")).plus(new Decimal("0.3"));
    expect(sum.toString()).toBe("0.6");
  });
});
