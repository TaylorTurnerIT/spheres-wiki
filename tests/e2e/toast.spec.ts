import { test, expect } from '@playwright/test';

test.describe('BetaToast', () => {
  test('toast is visible on first visit (no localStorage)', async ({ page }) => {
    // Clear all storage first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Reload to see toast
    await page.reload();
    await page.waitForLoadState('networkidle');
    const toast = page.locator('#beta-toast');
    // Toast should not have .is-hidden
    await expect(toast).not.toHaveClass(/is-hidden/);
  });

  test('toast close button dismisses and sets localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('beta-toast-dismissed');
      sessionStorage.removeItem('beta-toast-dismissed-animated');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const toast = page.locator('#beta-toast');
    const closeBtn = toast.locator('.site-toast-close');
    await expect(closeBtn).toBeVisible();

    await closeBtn.click();

    // Toast should be hidden
    await expect(toast).toHaveClass(/is-hidden/);

    // localStorage should be set
    const dismissed = await page.evaluate(() =>
      localStorage.getItem('beta-toast-dismissed')
    );
    expect(dismissed).toBe('true');

    // sessionStorage animated flag should be set
    const animated = await page.evaluate(() =>
      sessionStorage.getItem('beta-toast-dismissed-animated')
    );
    expect(animated).toBe('true');
  });

  test('toast stays hidden when localStorage says dismissed', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('beta-toast-dismissed', 'true');
      sessionStorage.setItem('beta-toast-dismissed-animated', 'true');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const toast = page.locator('#beta-toast');
    await expect(toast).toHaveClass(/is-hidden/);
  });

  test('localStorage dismissal persists across navigations', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('beta-toast-dismissed', 'true');
    });
    // Navigate to another page
    await page.locator('a[href*="/about/"]').first().click();
    await page.waitForLoadState('networkidle');
    const toast = page.locator('#beta-toast');
    await expect(toast).toHaveClass(/is-hidden/);
  });
});
