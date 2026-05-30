import { test, expect } from '@playwright/test';

test.describe('Meta tags', () => {
  test('home page has title and description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Spheres of Power Wiki');
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content');
  });

  test('power index has system-specific title', async ({ page }) => {
    await page.goto('/power/');
    await expect(page).toHaveTitle(/Spheres of Power/);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content');
  });

  test('might index has system-specific title', async ({ page }) => {
    await page.goto('/might/');
    await expect(page).toHaveTitle(/Spheres of Might/);
  });

  test('guile index has system-specific title', async ({ page }) => {
    await page.goto('/guile/');
    await expect(page).toHaveTitle(/Spheres of Guile/);
  });

  test('champions index has system-specific title', async ({ page }) => {
    await page.goto('/champions/');
    await expect(page).toHaveTitle(/Champions/);
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response!.headers();
    // These are meta http-equiv, check them via DOM
    const xcto = page.locator('meta[http-equiv="X-Content-Type-Options"]');
    await expect(xcto).toHaveAttribute('content', 'nosniff');
    const referrer = page.locator('meta[name="referrer"]');
    await expect(referrer).toHaveAttribute('content', 'strict-origin-when-cross-origin');
  });

  test('charset is UTF-8', async ({ page }) => {
    await page.goto('/');
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveAttribute('charset', 'UTF-8');
  });

  test('viewport is set for mobile', async ({ page }) => {
    await page.goto('/');
    const vp = page.locator('meta[name="viewport"]');
    await expect(vp).toHaveAttribute('content', /width=device-width/);
    await expect(vp).toHaveAttribute('content', /initial-scale=1/);
  });

  test('detailed pages have non-generic descriptions', async ({ page }) => {
    // Power sphere detail page
    await page.goto('/power/alteration/');
    const desc = page.locator('meta[name="description"]');
    const content = await desc.getAttribute('content');
    expect(content).toBeTruthy();
    // Should not be the generic fallback
    expect(content).not.toBe('A quick reference site for the Spheres system.');
  });
});
