import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("create a person, add a candidate profile and employment history", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  const personName = `Priya Fernwood ${Math.random().toString(36).slice(2, 8)}`;
  const [firstName, ...rest] = personName.split(" ");
  const lastName = rest.join(" ");

  await page.goto("/people/new");
  await page.getByLabel("First name").fill(firstName!);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByText("Candidate", { exact: true }).click();
  await page.getByLabel("Also create a candidate profile").check();
  await page.getByRole("button", { name: "Create person" }).click();

  await expect(page.getByRole("heading", { name: personName })).toBeVisible({ timeout: 8000 });

  // Candidate Profile tab should exist since the person is typed as CANDIDATE.
  await page.getByRole("tab", { name: "Candidate Profile" }).click();
  await expect(page.getByRole("button", { name: /candidate profile/i })).toBeVisible();

  // Add employment history.
  await page.getByRole("tab", { name: "Employment History" }).click();
  await page.getByRole("button", { name: "Add employment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Job title").fill("Chief Financial Officer");
  await dialog.getByLabel("Employer name (if not in CRM)").fill("Fernwood Testing Group");
  await dialog.getByLabel("Current role").check();
  await dialog.getByRole("button", { name: "Add employment" }).click();

  await expect(page.getByText("Chief Financial Officer").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Fernwood Testing Group")).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
});
