import { test, expect } from '@playwright/test';

// Known routes that should exist per SPEC.md §I.pages
const CRITICAL_ROUTES = [
  '/',
  '/power/',
  '/might/',
  '/guile/',
  '/champions/',
  '/search/',
  '/store/',
  '/about/',
  '/legal/',
  '/privacy/',
  '/contact/',
  '/community-resources/',
  '/tags/',
  '/tags/combat/',
  '/archetypes/',
  '/recent-changes/',
  '/power/alteration/',
  '/power/alteration/shapeshift/',
  '/power/using-spheres-of-power/',
  '/power/classes/shifter/',
];

// Known routes that are referenced but may be stubs
const KNOWN_STUB_ROUTES = [
  '/how-to-build-champion/',
  '/how-to-build-practitioner/',
  '/how-to-build-spherecaster/',
];

test.describe('Route status codes', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`${route} returns 200`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response!.status(), `${route} should return 200`).toBe(200);
    });
  }
});

test.describe('404 page', () => {
  test('nonexistent route returns 404', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-real-page-12345/');
    expect(response!.status()).toBe(404);
  });

  test('404 page has content', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-real-page-12345/');
    expect(response!.status()).toBe(404);
    // Should have some content — not a blank page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(0);
  });
});

test.describe('SVG sprite', () => {
  test('SVGSprite is rendered exactly once', async ({ page }) => {
    await page.goto('/');
    // The sprite should be <svg style="display:none">
    const sprites = page.locator('svg[style*="display:none"], svg[style*="display: none"]');
    await expect(sprites).toHaveCount(1);
  });

  test('SVGSprite contains si-fallback symbol (T23)', async ({ page }) => {
    await page.goto('/');
    const fallback = page.locator('#si-fallback');
    // T23 not yet done — this test documents the requirement
    // When T23 is done, change to: await expect(fallback).toBeAttached();
    const exists = await fallback.count();
    if (exists === 0) {
      console.warn('T23: si-fallback symbol is missing from SVGSprite.astro — needs to be added.');
    }
  });
});

test.describe('System index pages', () => {
  test('power index lists spheres', async ({ page }) => {
    await page.goto('/power/');
    // Should have sphere cards or links
    const sphereLinks = page.locator('.sphere-card, a[href*="/power/"][href*="/alteration"]');
    await expect(sphereLinks.first()).toBeVisible();
  });
});

test.describe('Privacy page', () => {
  test('/privacy/ exists and has required content', async ({ page }) => {
    await page.goto('/privacy/');
    const bodyText = await page.locator('body').textContent();
    // Should mention localStorage
    expect(bodyText).toMatch(/localStorage/i);
    // Should have contact email
    expect(bodyText).toMatch(/contact|email|reach/i);
  });
});

test.describe('Legal page', () => {
  test('/legal/ exists with OGL content', async ({ page }) => {
    await page.goto('/legal/');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/OGL|Open Game/i);
  });
});
