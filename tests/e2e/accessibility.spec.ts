import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("skip-to-content link works on keyboard", async ({ page }) => {
    await page.goto("/");
    // Press Tab to focus the skip link
    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeFocused();
    // Activate it
    await page.keyboard.press("Enter");
    // Main content should now be focused or at top
    const mainContent = page.locator("#main-content");
    await expect(mainContent).toBeVisible();
  });

  test("sidebar has correct ARIA attributes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.locator("#sidebar-toggle").click();
    const sidebar = page.locator("#site-sidebar");
    await expect(sidebar).toHaveAttribute("role", "dialog");
    await expect(sidebar).toHaveAttribute("aria-modal", "true");
    await expect(sidebar).toHaveAttribute("aria-label", "Site navigation");
  });

  test("hamburger button has correct ARIA attributes", async ({ page }) => {
    // Hamburger is only visible on mobile — use a mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    const toggle = page.locator("#sidebar-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-label", "Open navigation");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("search combobox has correct ARIA attributes", async ({ page }) => {
    await page.goto("/");
    const combo = page.locator("#search-combobox");
    await expect(combo).toHaveAttribute("role", "combobox");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(combo).toHaveAttribute("aria-haspopup", "listbox");
  });

  test("search input has correct ARIA attributes", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("#page-search");
    await expect(searchInput).toHaveAttribute("aria-label");
    await expect(searchInput).toHaveAttribute("aria-autocomplete", "list");
    await expect(searchInput).toHaveAttribute(
      "aria-controls",
      "search-results",
    );
  });

  test("BetaToast has correct ARIA attributes", async ({ page }) => {
    await page.goto("/");
    const toast = page.locator("#beta-toast");
    await expect(toast).toHaveAttribute("role", "status");
    await expect(toast).toHaveAttribute("aria-live", "polite");
    await expect(toast).toHaveAttribute("aria-atomic", "true");
  });

  test("page has exactly one h1", async ({ page }) => {
    await page.goto("/");
    const h1s = page.locator("h1");
    await expect(h1s).toHaveCount(1);
  });
});
