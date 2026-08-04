import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("global search finds a seeded organisation and navigates to it", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);

  await page.getByRole("button", { name: /Search/ }).click();
  await page.getByPlaceholder(/Search organisations, people, opportunities, mandates/).fill("Vantage Logistics");

  const result = page.getByText("Vantage Logistics Group", { exact: true }).first();
  await expect(result).toBeVisible({ timeout: 8000 });
  await result.click();

  await page.waitForURL("**/organisations/**", { timeout: 8000 });
  await expect(page.getByRole("heading", { name: "Vantage Logistics Group" })).toBeVisible();
});
