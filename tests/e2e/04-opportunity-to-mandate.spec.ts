import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("create an opportunity for a portfolio company and convert it to a mandate", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  const oppName = `E2E Search ${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/opportunities/new");
  await page.getByLabel("Opportunity name").fill(oppName);
  await page.getByLabel("Hiring organisation").click();
  await page.getByRole("option", { name: "Vantage Logistics Group" }).click();
  await page.getByRole("button", { name: "Create opportunity" }).click();

  await expect(page.getByRole("heading", { name: oppName })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Signal Identified").first()).toBeVisible();

  // Move through the pipeline via the accessible stage select (equivalent to
  // dragging the kanban card) up to Won, then convert to a mandate.
  const stageSelect = page.getByLabel("Change opportunity stage");
  for (const stage of ["Contact Identified", "Contacted", "Discovery Arranged", "Qualified", "Proposal / Terms"]) {
    await stageSelect.click();
    await page.getByRole("option", { name: stage, exact: true }).click();
    await expect(page.getByText(stage, { exact: true }).first()).toBeVisible({ timeout: 8000 });
  }

  await stageSelect.click();
  await page.getByRole("option", { name: "Won", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("button", { name: "Convert to Mandate" })).toBeVisible({ timeout: 8000 });

  await page.getByRole("button", { name: "Convert to Mandate" }).click();

  // Conversion redirects straight to the new mandate.
  await page.waitForURL("**/mandates/**", { timeout: 10000 });
  await expect(page.getByText("Brief Received").first()).toBeVisible();
});
