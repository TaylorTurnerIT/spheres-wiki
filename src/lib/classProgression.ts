import { ordinal } from "./levelLabel";
import type { ClassFeatureEntry } from "./types";

export type ParsedClassTable = {
  extraHeaders: string[];
  specialSource: Record<number, string>;
  extraRowData: Record<number, string[]>;
};

export function computeBAB(level: number, progression: string): number {
  switch (progression) {
    case "full":
      return level;
    case "3/4":
      return Math.floor(level * 0.75);
    case "half":
      return Math.floor(level * 0.5);
    default:
      return Math.floor(level * 0.75);
  }
}

export function computeSave(level: number, progression: string): number {
  switch (progression) {
    case "good":
      return 2 + Math.floor(level / 2);
    case "poor":
      return Math.floor(level / 3);
    default:
      return Math.floor(level / 3);
  }
}

export function formatBAB(bab: number): string {
  const attacks: string[] = [];
  let value = bab;
  while (value > 0 && attacks.length < 4) {
    attacks.push(`+${value}`);
    value -= 5;
  }
  return attacks.length > 0 ? attacks.join("/") : "+0";
}

export function formatSave(value: number): string {
  return `+${value}`;
}

export function levelOrdinal(level: number): string {
  return `${level}${ordinal(level)}`;
}

const CASTER_LEVEL_MID = [
  0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15,
];
const CASTER_LEVEL_LOW = [
  0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
];

export function computeCasterLevel(level: number, tier: string): number {
  if (tier === "high") return level;
  if (tier === "mid") return CASTER_LEVEL_MID[level - 1] ?? 0;
  if (tier === "low") return CASTER_LEVEL_LOW[level - 1] ?? 0;
  return 0;
}

export function computeMagicTalents(level: number, tier: string): number {
  if (tier === "high") return level + 2;
  if (tier === "mid") return Math.floor((3 * level) / 4) + 2;
  return Math.floor(level / 2) + 2;
}

export function parseClassTable(
  raw: string | undefined,
): ParsedClassTable | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return JSON.parse(parsed);
    return parsed as ParsedClassTable;
  } catch {
    return null;
  }
}

export function buildFeaturesByLevel(
  features: ClassFeatureEntry[],
): Record<number, { name: string; id: string }[]> {
  const byLevel: Record<number, { name: string; id: string }[]> = {};
  for (const feature of features) {
    const levels = Array.isArray(feature.level)
      ? feature.level
      : [feature.level];
    for (const level of levels) {
      (byLevel[level] ??= []).push({ name: feature.name, id: feature.id });
    }
  }
  return byLevel;
}
