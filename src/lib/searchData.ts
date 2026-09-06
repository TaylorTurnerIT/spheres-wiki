// src/lib/searchData.ts
// Metadata dictionary and helpers for the header search bar and quick-search panel.

const SPHERE_TALENT_COUNTS: Record<string, number> = {
  alchemy: 92,
  alteration: 66,
  artifice: 74,
  athletics: 89,
  barrage: 28,
  barroom: 60,
  beastmastery: 52,
  berserker: 45,
  blood: 50,
  bluster: 53,
  "body-control": 58,
  boxing: 41,
  brute: 45,
  communication: 63,
  conjuration: 98,
  creation: 57,
  dark: 73,
  death: 70,
  destruction: 93,
  divination: 71,
  "dual-wielding": 38,
  duelist: 50,
  enhancement: 51,
  equipment: 135,
  faction: 48,
  "fallen-fey": 65,
  fate: 96,
  fencing: 45,
  gladiator: 70,
  guardian: 43,
  herbalism: 56,
  illusion: 53,
  infiltration: 43,
  investigation: 44,
  lancer: 28,
  leadership: 49,
  life: 52,
  light: 62,
  mana: 85,
  mind: 71,
  nature: 60,
  navigation: 63,
  "open-hand": 45,
  performance: 70,
  protection: 94,
  scoundrel: 49,
  scout: 42,
  shield: 23,
  sniper: 32,
  spellhacking: 61,
  study: 41,
  subterfuge: 48,
  survivalism: 68,
  telekinesis: 48,
  time: 49,
  trap: 54,
  vocation: 134,
  war: 99,
  warleader: 56,
  warp: 68,
  weather: 86,
  wrestling: 46,
};

export const CLASS_SUBTITLES: Record<string, string> = {
  shifter: "Alteration specialist",
  armorist: "Equipment specialist",
  elementalist: "Destruction specialist",
  eliciter: "Mind & charm specialist",
  "fey-adept": "Illusion & shadow specialist",
  hedgewitch: "Traditions specialist",
  incanter: "Pure spherecaster",
  mageknight: "Gish combat specialist",
  "soul-weaver": "Life & death specialist",
  symbiat: "Telekinesis & enhancement specialist",
  thaumaturge: "Risk & reward caster",
  wraith: "Incorporeal darkness specialist",
  "crimson-dancer": "Champion of blood & steel",
};

export function getSphereTalentCount(
  sphereSlugOrName: string,
): number | undefined {
  const slug = sphereSlugOrName.toLowerCase().replace(/[\s_]+/g, "-");
  return SPHERE_TALENT_COUNTS[slug];
}

// fallow-ignore-next-line complexity
export function getSphereSubtitle(
  system?: string,
  talentCount?: number,
): string {
  const sysKey = (system || "").toLowerCase();
  let sphereLabel = "Sphere";
  if (sysKey.includes("power")) sphereLabel = "Magic sphere";
  else if (sysKey.includes("might")) sphereLabel = "Combat sphere";
  else if (sysKey.includes("guile")) sphereLabel = "Skill sphere";
  else if (sysKey.includes("champ")) sphereLabel = "Champion sphere";

  if (talentCount !== undefined && talentCount > 0) {
    return `${sphereLabel} · ${talentCount} talents`;
  }
  return sphereLabel;
}
