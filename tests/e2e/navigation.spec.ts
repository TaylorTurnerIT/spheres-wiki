import { test, expect } from '@playwright/test';

test.describe('Navigation — sidebar', () => {
  test('sidebar opens on hamburger click', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#sidebar-toggle');
    await toggle.click();
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar).toHaveClass(/open/);
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  });

  test('sidebar closes on close button click', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar-toggle').click();
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar).toHaveClass(/open/);
    await page.locator('#sidebar-close').click();
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  });

  test('sidebar closes on Escape key', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar-toggle').click();
    await page.keyboard.press('Escape');
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar).not.toHaveClass(/open/);
  });

  test('sidebar closes on backdrop click', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar-toggle').click();
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar).toHaveClass(/open/);
    // Click the sidebar backdrop (the element itself, not inner)
    await sidebar.click({ position: { x: 5, y: 5 } });
    await expect(sidebar).not.toHaveClass(/open/);
  });

  test('sidebar has system sections', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar-toggle').click();
    const sidebar = page.locator('#site-sidebar');
    await expect(sidebar.locator('.sidebar-heading.power')).toBeVisible();
    await expect(sidebar.locator('.sidebar-heading.might')).toBeVisible();
    await expect(sidebar.locator('.sidebar-heading.guile')).toBeVisible();
    await expect(sidebar.locator('.sidebar-heading.champ')).toBeVisible();
  });

  test('sidebar links do not 404', async ({ page }) => {
    await page.goto('/');
    // Collect all sidebar links
    const links = await page.locator('#site-sidebar a[href]').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href')!)
    );
    // Filter to internal links only
    const internalLinks = links.filter((href) => href.startsWith('/') || href.startsWith('http://localhost'));
    for (const href of internalLinks) {
      const response = await page.request.get(href);
      expect(response.status(), `Sidebar link ${href} should not 404`).toBeLessThan(400);
    }
  });
});

test.describe('Navigation — header nav', () => {
  test('header nav links do not 404', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('.header-nav a').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href')!)
    );
    for (const href of links) {
      expect(href).toBeTruthy();
      const response = await page.request.get(href);
      expect(response.status(), `Header link ${href} should not 404`).toBeLessThan(400);
    }
  });
});

test.describe('Navigation — View Transitions (V11/B1)', () => {
  test('search bar is initialized after client-side navigation', async ({ page }) => {
    await page.goto('/');
    // Navigate to about page via client-side nav
    await page.locator('a[href*="/about/"]').first().click();
    await page.waitForLoadState('networkidle');
    // Navigate back home
    await page.goBack();
    await page.waitForLoadState('networkidle');
    // Search input should still exist in DOM
    const searchInput = page.locator('#page-search');
    await expect(searchInput).toBeVisible();
  });

  test('sidebar toggle works after client-side navigation', async ({ page }) => {
    await page.goto('/');
    // Navigate away
    await page.locator('a[href*="/about/"]').first().click();
    await page.waitForLoadState('networkidle');
    // Navigate back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    // Sidebar toggle should still work
    await page.locator('#sidebar-toggle').click();
    await expect(page.locator('#site-sidebar')).toHaveClass(/open/);
  });
});

test.describe('Navigation — TabNav', () => {
  test('TabNav is present on system pages', async ({ page }) => {
    await page.goto('/power/');
    await expect(page.locator('.tab-nav')).toBeVisible();
  });

  test('TabNav links do not 404', async ({ page }) => {
    await page.goto('/power/');
    const links = await page.locator('.tab-nav a').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).getAttribute('href')!)
    );
    for (const href of links) {
      expect(href).toBeTruthy();
      const response = await page.request.get(href);
      expect(response.status(), `TabNav link ${href} should not 404`).toBeLessThan(400);
    }
  });
});
