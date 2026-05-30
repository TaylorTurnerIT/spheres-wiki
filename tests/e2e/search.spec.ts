import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('search bar is present on home page', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#page-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search/);
  });

  test('search icon button navigates to full search page', async ({ page }) => {
    await page.goto('/');
    // Click the search icon to go to full search
    await page.locator('#search-icon-btn').click();
    await page.waitForURL(/\/search\//);
    await expect(page.locator('.search-page')).toBeVisible();
  });

  test('search icon with query navigates to search with query param', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#page-search');
    await searchInput.fill('alteration');
    await page.locator('#search-icon-btn').click();
    await page.waitForURL(/\/search\/\?q=alteration/);
  });

  test('search full page is rendered', async ({ page }) => {
    await page.goto('/search/');
    await expect(page.locator('.search-page')).toBeVisible();
  });

  test('search bar persists after back navigation (B1 regression)', async ({ page }) => {
    await page.goto('/');
    // Navigate away
    await page.locator('a[href*="/about/"]').first().click();
    await page.waitForLoadState('networkidle');
    // Navigate back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    // Search bar must still be present
    await expect(page.locator('#page-search')).toBeVisible();
  });

  test('search bar persists after forward navigation (B1 regression)', async ({ page }) => {
    await page.goto('/');
    // Navigate away
    await page.locator('a[href*="/about/"]').first().click();
    await page.waitForLoadState('networkidle');
    // Go back then forward
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.goForward();
    await page.waitForLoadState('networkidle');
    // Search bar must still be present on about page too (header is global)
    await expect(page.locator('#page-search')).toBeVisible();
  });
});
