import { test, expect } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

test("sign in and reach the dashboard", async ({ page }) => {
  await loginAs(page, ADAM_EMAIL);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByText("My tasks due today")).toBeVisible();
});

test("rejects an invalid password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADAM_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});
