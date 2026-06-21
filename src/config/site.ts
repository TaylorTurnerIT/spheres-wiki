export const SITE_TITLE = "The Spheres Wiki";
export const SITE_TAGLINE = "A Quick Reference Site";

export const HEADER_NAV = [
  { label: "About", href: "/about/" },
  { label: "Feats", href: "/feats/" },
  { label: "Legal & OGL", href: "/legal/" },
  { label: "Recent Changes", href: "/recent-changes/" },
] as const;

export type SystemConfig = {
  label: string;
  color: string;
  darkColor: string;
  route: string;
  cssKey: string;
  subtitle: string;
  classLabel: string;
  description: string;
  introLinkText: string;
  buildText: string;
  buildHref: string;
};

export const SYSTEMS: Record<string, SystemConfig> = {
  power: {
    label: "Spheres of Power",
    color: "#174B93",
    darkColor: "#0D2850",
    route: "/power/",
    cssKey: "power",
    subtitle: "Magic Spheres",
    classLabel: "Spherecaster Classes",
    description:
      "The magic system. Build custom spellcasters by combining magical spheres — flexible talents over spell slots.",
    introLinkText: "Using Spheres of Power →",
    buildText: "Using Spheres of Power →",
    buildHref: "/power/using-spheres-of-power/",
  },
  might: {
    label: "Spheres of Might",
    color: "#8f2d00",
    darkColor: "#3D1200",
    route: "/might/",
    cssKey: "might",
    subtitle: "Combat Spheres",
    classLabel: "Practitioner Classes",
    description:
      "For martial characters. Craft fighters, archers, brawlers, and commanders from talents instead of rigid feat trees.",
    introLinkText: "Using Spheres of Might →",
    buildText: "How to Build a Practitioner →",
    buildHref: "/might/",
  },
  guile: {
    label: "Spheres of Guile",
    color: "#5A2D96",
    darkColor: "#180B2E",
    route: "/guile/",
    cssKey: "guile",
    subtitle: "Skill Spheres",
    classLabel: "Operative Classes",
    description:
      "The skills system. Run organizations, craft masterworks, infiltrate networks — with real mechanical weight.",
    introLinkText: "Using Spheres of Guile →",
    buildText: "How to Build an Operative →",
    buildHref: "/guile/",
  },
  champions: {
    label: "Champions of the Spheres",
    color: "#165A1C",
    darkColor: "#091E0C",
    route: "/champions/",
    cssKey: "champ",
    subtitle: "Multi-system",
    classLabel: "Champion Classes",
    description:
      "Blend magic and martial together. Bridge both systems for characters who fight and cast in equal measure.",
    introLinkText: "Using Champions →",
    buildText: "How to Build a Champion →",
    buildHref: "/champions/",
  },
};

export const SYSTEM_DEFAULT = {
  color: "#535048",
  darkColor: "#3E3830",
  cssKey: "",
} as const;

/**
 * Shown as a banner at the top of the home page. Set to null to hide.
 * Format: plain text; use · as separator between items.
 */
export const ANNOUNCEMENT: string | null =
  "Baron's Uncanny Gateway added (2/11) · Coming Soon: Diamond Spheres: Expanded Tinker & Silverminds · Arcforge Players' Compendium";
