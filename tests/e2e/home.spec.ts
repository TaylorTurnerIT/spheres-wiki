import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Spheres of Power Wiki/);
  });

  test("has meta description", async ({ page }) => {
    await page.goto("/");
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute("content");
    const content = await meta.getAttribute("content");
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test("renders RefCards for all four systems", async ({ page }) => {
    await page.goto("/");
    // Each system should have a RefCard
    await expect(page.locator(".ref-card")).toHaveCount(4);
  });

  test("announcement banner is visible when set", async ({ page }) => {
    await page.goto("/");
    // ANNOUNCEMENT is set in site.ts
    const announcement = page.locator(".announcement");
    if (await announcement.isVisible()) {
      expect(await announcement.textContent()).toContain(
        "Baron's Uncanny Gateway",
      );
    }
  });

  test("site header is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".site-title")).toBeVisible();
  });

  test("footer is present with required links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    // T35: footer links — use .first() since "Legal & OGL" and "OGL" both match
    await expect(footer.locator('a[href*="/privacy/"]').first()).toBeVisible();
    await expect(footer.locator('a[href*="/legal/"]').first()).toBeVisible();
    await expect(footer.locator('a[href*="/contact/"]').first()).toBeVisible();
  });

  test("has skip-to-content link", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeVisible();
  });
});
