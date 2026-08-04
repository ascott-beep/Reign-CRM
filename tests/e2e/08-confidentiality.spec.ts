import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL, YAGMUR_EMAIL } from "./helpers";

// R-2026-0004 (Group Finance Director) is seeded HIGHLY_CONFIDENTIAL, owned by
// and only assigned to Adam. Yagmur (a STANDARD user, not assigned) must be
// blocked from the detail page and must not see it in her mandate list.
test("a highly-confidential mandate is hidden from a non-assigned standard user", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  await page.goto("/mandates?display=table");
  await expect(page.getByRole("link", { name: "R-2026-0004" })).toBeVisible({ timeout: 8000 });
  await page.getByRole("link", { name: "R-2026-0004" }).click();
  await page.waitForURL("**/mandates/**");
  const mandateUrl = page.url();
  await expect(page.getByRole("heading", { name: /Group Finance Director/ })).toBeVisible();

  await page.getByRole("button", { name: "AW" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/login");

  await loginAs(page, YAGMUR_EMAIL);

  await page.goto("/mandates?display=table");
  await expect(page.getByRole("link", { name: "R-2026-0004" })).not.toBeVisible();

  await page.goto(mandateUrl);
  await expect(page.getByText("Access restricted")).toBeVisible({ timeout: 8000 });
});
