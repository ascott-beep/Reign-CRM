import { test, expect, type Page } from "@playwright/test";
import { loginAs, ADAM_EMAIL } from "./helpers";

/**
 * Round 2 section 1: one sizing system for every toolbar control (36px
 * tall), and no page scrolls where it shouldn't. Loads every primary page
 * in light and dark at 1440x900 and fails on the exact things Adam's
 * screenshots showed: mismatched control heights, horizontal scroll
 * anywhere, and vertical scroll on the Overview.
 */
const PAGES = ["/dashboard", "/mandates", "/opportunities", "/people", "/organisations", "/intelligence", "/tasks", "/reports"];

async function checkPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  const docOverflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(docOverflow, `${path} scrolls horizontally by ${docOverflow}px`).toBeLessThanOrEqual(1);

  if (path === "/dashboard") {
    const mainOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return 0;
      return main.scrollHeight - main.clientHeight;
    });
    expect(mainOverflow, `Overview scrolls vertically by ${mainOverflow}px`).toBeLessThanOrEqual(1);
  }

  const heights = await page.evaluate(() => {
    const groups = document.querySelectorAll<HTMLElement>("[data-toolbar]");
    const out: number[] = [];
    groups.forEach((g) => {
      Array.from(g.children).forEach((child) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        if (rect.height > 0) out.push(Math.round(rect.height));
      });
    });
    return out;
  });

  for (const h of heights) {
    expect(h, `${path}: toolbar control is ${h}px, expected 36px`).toBeGreaterThanOrEqual(35);
    expect(h, `${path}: toolbar control is ${h}px, expected 36px`).toBeLessThanOrEqual(37);
  }
}

test.describe("Round 2 section 1 — sizing regression", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`every page: 36px toolbar controls, no stray scroll (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await loginAs(page, ADAM_EMAIL);

      for (const path of PAGES) {
        await checkPage(page, path);
      }
    });
  }
});
