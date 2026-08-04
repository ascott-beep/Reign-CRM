import type { Page } from "@playwright/test";

export async function loginAs(page: Page, email: string, password = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

export const ADAM_EMAIL = "adam@reign.partners";
export const YAGMUR_EMAIL = "yagmur@reign.partners";
