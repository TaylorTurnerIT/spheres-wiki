import { SYSTEMS, type SystemConfig } from "@/config/site";

export type { SystemConfig };

/** Returns getStaticPaths-compatible params for every registered system. */
export function getSystemPaths(): Array<{ params: { system: string } }> {
  return Object.keys(SYSTEMS).map((id) => ({ params: { system: id } }));
}

/** Resolves a system id to its registry entry, or undefined if unknown. */
export function resolveSystem(id: string): SystemConfig | undefined {
  return SYSTEMS[id];
}

/**
 * Returns the Pagefind filter value for the given system.
 * Format matches the data-pagefind-filter attribute: "system:<Label>"
 * e.g. "system:Spheres of Power"
 */
export function getSystemSearchFilter(id: string): string {
  const system = SYSTEMS[id];
  if (!system) return `system:${id}`;
  return `system:${system.label}`;
}

/**
 * CSS class key for a system id ("champions" → "champ"), from the SYSTEMS
 * registry (V53). Use instead of inline `=== 'champions' ? 'champ'` ternaries.
 */
export function systemCssKey(id: string): string {
  return SYSTEMS[id]?.cssKey ?? id;
}

/** Lookup key for a system-scoped entry index. */
export function systemIdKey(system: string, id: string): string {
  return `${system}:${id}`;
}

/**
 * Builds a "{system}:{id}" index over resolved entries so getStaticPaths
 * loops can replace repeated `[...map.values()].find(...)` linear scans
 * with O(1) lookups. First entry wins on collisions, matching find semantics.
 */
export function buildSystemIdIndex<T extends { id: string; system: string }>(
  entries: Iterable<T>,
): Map<string, T> {
  const index = new Map<string, T>();
  for (const entry of entries) {
    const key = systemIdKey(entry.system, entry.id);
    if (!index.has(key)) index.set(key, entry);
  }
  return index;
}
