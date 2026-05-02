export const SITE_TITLE = 'Spheres of Power Wiki';
export const SITE_TAGLINE = 'A Quick Reference Site';

export const HEADER_NAV = [
  { label: 'About', href: '/about/' },
  { label: 'Legal & OGL', href: '/legal/' },
  { label: 'Recent Changes', href: '/recent-changes/' },
] as const;

export const FEATURED_RELEASE = {
  title: 'Ultimate Engineering',
  publisher: 'Drop Dead Studios',
  price: '$19.99',
  buyUrl: 'https://preview.drivethrurpg.com/en/product/472038/Ultimate-Engineering?affiliate_id=549120',
  bookSlug: 'ultimate-engineering',
} as const;

export const NAMESPACE_COLORS: Record<string, { primary: string; dark: string }> = {
  power:     { primary: '#174B93', dark: '#0D2850' },
  might:     { primary: '#8f2d00', dark: '#3D1200' },
  guile:     { primary: '#5A2D96', dark: '#180B2E' },
  champions: { primary: '#165A1C', dark: '#091E0C' },
  default:   { primary: '#535048', dark: '#3E3830' },
};

export const NAMESPACE_LABELS: Record<string, string> = {
  power:     'Spheres of Power',
  might:     'Spheres of Might',
  guile:     'Spheres of Guile',
  champions: 'Champions of the Spheres',
};

export const TAB_ORDER = [
  'home',
  'power',
  'might',
  'guile',
  'champions',
  'store',
] as const;

/**
 * Shown as a banner at the top of the home page. Set to null to hide.
 * Format: plain text; use · as separator between items.
 */
export const ANNOUNCEMENT: string | null =
  'Baron\'s Uncanny Gateway added (2/11) · Coming Soon: Diamond Spheres: Expanded Tinker & Silverminds · Arcforge Players\' Compendium';
