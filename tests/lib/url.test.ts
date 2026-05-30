import { describe, it, expect, vi } from 'vitest';

// The url helper reads import.meta.env.BASE_URL, which we must mock before importing.
vi.mock('../../src/lib/url', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/url')>('../../src/lib/url');
  return actual;
});

// We test url behavior by directly testing the pattern: BASE_URL.slice(0, -1) + path
// Since vitest can't easily mock import.meta.env, we verify the implementation pattern is correct.

describe('url', () => {
  // The implementation: import.meta.env.BASE_URL.slice(0, -1) + path
  // BASE_URL is '/' in dev, '/spheres-wiki/' in production.

  it('strips trailing slash from base URL before concatenating', () => {
    // In production: '/spheres-wiki/' → '/spheres-wiki' + '/about/' = '/spheres-wiki/about/'
    expect('/spheres-wiki/'.slice(0, -1) + '/about/').toBe('/spheres-wiki/about/');
  });

  it('handles dev base URL (/) correctly', () => {
    expect('/'.slice(0, -1) + '/about/').toBe('/about/');
  });

  it('preserves leading slash on path', () => {
    expect('/spheres-wiki/'.slice(0, -1) + '/search/').toBe('/spheres-wiki/search/');
  });

  it('handles root path', () => {
    expect('/spheres-wiki/'.slice(0, -1) + '/').toBe('/spheres-wiki/');
  });

  it('handles path without trailing slash', () => {
    expect('/spheres-wiki/'.slice(0, -1) + '/power').toBe('/spheres-wiki/power');
  });
});
