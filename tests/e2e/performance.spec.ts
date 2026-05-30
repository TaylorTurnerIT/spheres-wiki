import { test, expect } from '@playwright/test';

test.describe('Performance — no external CDN (V11/V12)', () => {
  test('no external script requests on home page', async ({ page }) => {
    const externalScripts: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Allow localhost (dev server) and pagefind (bundled)
      if (url.includes('localhost')) return;
      if (url.includes('127.0.0.1')) return;
      if (url.includes('pagefind')) return; // Pagefind is bundled locally
      // Ignore data URLs, blob URLs
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      // Track any external CDN/js requests
      if (request.resourceType() === 'script' || request.resourceType() === 'stylesheet') {
        externalScripts.push(url);
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    // Log for observability
    if (externalScripts.length > 0) {
      console.warn('External script/stylesheet requests detected:', externalScripts);
    }
    // V11: Zero external CDN requests
    expect(externalScripts.length, `External scripts detected: ${externalScripts.join(', ')}`).toBe(0);
  });

  test('no external font requests on home page', async ({ page }) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('fonts.googleapis.com') || request.url().includes('fonts.gstatic.com')) {
        fontRequests.push(request.url());
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(fontRequests.length).toBe(0);
  });

  test('fonts are self-hosted (T33)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Check that Cinzel and Crimson Text are loaded from local _astro or @fontsource
    const fontFiles: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('cinzel') || url.includes('crimson') || url.includes('Crimson') || url.includes('Cinzel')) {
        fontFiles.push(url);
      }
    });
    // Trigger a reload to catch font loads
    await page.reload({ waitUntil: 'networkidle' });
    // Font files should come from local domain, not external CDN
    for (const f of fontFiles) {
      expect(f).not.toContain('fonts.googleapis.com');
      expect(f).not.toContain('fonts.gstatic.com');
    }
  });

  test('no analytics scripts (V12)', async ({ page }) => {
    const analyticsCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      const analyticsPatterns = [
        'google-analytics', 'gtag', 'analytics', 'pixel',
        'facebook.com/tr', 'doubleclick', 'hotjar', 'clarity',
        'umami', 'plausible', 'fathom', 'matomo', 'mixpanel',
      ];
      if (analyticsPatterns.some((p) => url.includes(p))) {
        analyticsCalls.push(url);
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(analyticsCalls.length).toBe(0);
  });
});

test.describe('Performance — general', () => {
  test('page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);
  });

  test('page renders without console errors on sphere detail page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/power/alteration/');
    await page.waitForLoadState('networkidle');
    expect(errors.length, `Console errors: ${errors.join('; ')}`).toBe(0);
  });
});
