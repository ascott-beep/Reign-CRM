import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("create a task and mark it complete", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  const taskTitle = `E2E follow up ${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/tasks/new");
  await page.getByLabel("Title").fill(taskTitle);
  await page.getByRole("button", { name: "Create task" }).click();
  await page.waitForURL("**/tasks", { timeout: 8000 });

  await page.goto("/tasks?filter=all");
  await expect(page.getByRole("cell", { name: taskTitle })).toBeVisible({ timeout: 8000 });

  const row = page.getByRole("row").filter({ hasText: taskTitle });
  await row.getByRole("button", { name: "Complete" }).click();
  await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible({ timeout: 8000 });

  await page.goto("/tasks?filter=completed");
  await expect(page.getByRole("cell", { name: taskTitle })).toBeVisible({ timeout: 8000 });
});
