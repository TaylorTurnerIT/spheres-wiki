/**
 * Ordinal level formatting for class features ("1st", "3rd, 5th").
 * Previously copy-pasted in ClassFeatureBlock, the class page, and the
 * archetype page.
 */
const SUFFIXES = ["th", "st", "nd", "rd"];

export function ordinal(n: number): string {
  const v = n % 100;
  return SUFFIXES[(v - 20) % 10] ?? SUFFIXES[v] ?? SUFFIXES[0];
}

export function levelLabel(level: number | number[]): string {
  if (Array.isArray(level))
    return level.map((l) => `${l}${ordinal(l)}`).join(", ");
  return `${level}${ordinal(level)}`;
}
