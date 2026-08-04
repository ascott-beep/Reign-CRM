import { test, expect, type Page } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

/** Duplicate detection is deliberately fuzzy — confirm-and-retry if it fires. */
async function confirmDuplicateIfPresent(page: Page, retrySubmitLabel: string) {
  const confirmCheckbox = page.getByLabel(/this is a distinct organisation/i);
  const appeared = await confirmCheckbox
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await confirmCheckbox.check();
    await page.getByRole("button", { name: retrySubmitLabel }).click();
  }
}

test("create a fund and a portfolio company, then connect them via an investment relationship", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  // Deliberately dissimilar names (different words, unrelated random suffixes)
  // so fuzzy duplicate detection doesn't fire between these two fixtures —
  // that behaviour has its own coverage in tests/integration/duplicate-detection.test.ts.
  const fundName = `Northbridge Capital Partners ${Math.random().toString(36).slice(2, 10)}`;
  const companyName = `Silverline Industrial Holdings ${Math.random().toString(36).slice(2, 10)}`;

  // Create fund
  await page.goto("/organisations/new");
  await page.getByLabel("Organisation name").fill(fundName);
  await page.getByLabel("Type").click();
  await page.getByRole("option", { name: "PE Fund", exact: true }).click();
  await page.getByRole("button", { name: "Create organisation" }).click();
  await confirmDuplicateIfPresent(page, "Create organisation");
  await expect(page.getByRole("heading", { name: fundName })).toBeVisible();

  // Create portfolio company
  await page.goto("/organisations/new");
  await page.getByLabel("Organisation name").fill(companyName);
  await page.getByLabel("Type").click();
  await page.getByRole("option", { name: "Portfolio Company", exact: true }).click();
  await page.getByRole("button", { name: "Create organisation" }).click();
  await confirmDuplicateIfPresent(page, "Create organisation");
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();

  // Connect them via an investment relationship
  await page.getByRole("tab", { name: /Investments & Relationships/i }).click();
  await page.getByRole("button", { name: "Add relationship" }).click();
  await page.getByLabel("Related organisation").click();
  await page.getByRole("option", { name: new RegExp(fundName) }).click();
  await page.getByLabel("Relationship type").click();
  await page.getByRole("option", { name: "Current Investor In", exact: true }).click();
  await page.getByRole("button", { name: "Add relationship", exact: true }).click();

  await expect(page.getByRole("link", { name: fundName })).toBeVisible();
  await expect(page.getByText("Current investor")).toBeVisible();
});
