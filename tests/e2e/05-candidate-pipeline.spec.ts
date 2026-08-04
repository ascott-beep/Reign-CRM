import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("add a candidate to a mandate, move through stages, schedule an interview, make an offer and place them", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  // Michael Tan carries no off-limits restriction in the seed data (unlike
  // David Krause, whose recent Kestrel placement guarantee is exercised by
  // the off-limits integration tests instead).
  const candidateName = "Michael Tan";

  // Use the seeded active mandate with an open pipeline (Bracken VP Finance, R-2026-0002).
  await page.goto("/mandates?display=table");
  await page.getByRole("link", { name: "R-2026-0002" }).click();
  await page.waitForURL("**/mandates/**");

  await page.getByRole("tab", { name: /Candidate Pipeline/i }).click();
  await page.getByRole("button", { name: "Add candidate" }).click();
  await page.getByRole("combobox", { name: "Candidate" }).click();
  await page.getByRole("option", { name: candidateName }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to pipeline" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8000 });

  await expect(page.getByText(candidateName).first()).toBeVisible({ timeout: 8000 });
  await page.getByText(candidateName).first().click();

  const quickView = page.getByRole("dialog").filter({ hasText: candidateName });
  await expect(quickView).toBeVisible();

  // Move the candidate through a couple of simple stages via the accessible select.
  const candidateStageSelect = quickView.getByLabel("Change candidate stage");
  await candidateStageSelect.click();
  await page.getByRole("option", { name: "Contacted", exact: true }).click();
  await expect(candidateStageSelect).toHaveText("Contacted", { timeout: 8000 });

  // Schedule an interview.
  await quickView.getByRole("button", { name: "Schedule interview" }).click();
  const interviewDialog = page.getByRole("dialog").filter({ hasText: "Schedule interview" });
  await interviewDialog.getByLabel("Date & time").fill("2027-03-15T10:00");
  await interviewDialog.getByRole("button", { name: "Schedule" }).click();
  await expect(quickView.getByText("Round 1")).toBeVisible({ timeout: 8000 });

  // Create an accepted offer.
  await quickView.getByRole("button", { name: "Create offer" }).click();
  const offerDialog = page.getByRole("dialog").filter({ hasText: "Create offer" });
  await offerDialog.getByLabel("Base amount").fill("125000");
  await offerDialog.getByRole("button", { name: "Create offer", exact: true }).click();
  await expect(quickView.getByText("£125,000").or(quickView.getByText("GBP 125000"))).toBeVisible({ timeout: 8000 });

  // Mark as placed.
  await quickView.getByRole("button", { name: "Mark as Placed" }).click();
  const placeDialog = page.getByRole("dialog").filter({ hasText: "Record placement" });
  await placeDialog.getByLabel("Employment type").click();
  await page.getByRole("option", { name: "Permanent", exact: true }).click();
  await placeDialog.getByRole("button", { name: "Record placement" }).click();

  await expect(quickView.getByText(/Placed on/i)).toBeVisible({ timeout: 8000 });
});
