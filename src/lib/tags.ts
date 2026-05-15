import type { AnyEntry, BookMeta, TagEntry } from "./types";

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: { includeSphere?: boolean; currentSphereId?: string },
): string[] {
  const tags = new Set<string>();
  const userTags =
    "tags" in entry && Array.isArray(entry.tags)
      ? entry.tags.map((t) => t.toLowerCase())
      : [];

  if (entry.type === "talent") tags.add("talent");
  if (entry.type === "feat") tags.add("feat");
  if (entry.type === "sphere") tags.add("sphere");

  if (entry.type === "talent" && entry.tier) {
    if (entry.tier === "base") tags.add("base");
    else if (entry.tier === "basic") tags.add("basic");
    else if (entry.tier === "advanced") tags.add("advanced");
  }

  const pub = bookMetaMap.get(entry.sourceBook)?.publisher;
  if (
    pub &&
    !["Drop Dead Studios", "Diamond Recreational Studios"].includes(pub)
  ) {
    tags.add("3pp");
  }

  // Add user tags
  for (const t of userTags) {
    tags.add(t);
  }

  // Dual-sphere logic
  const hasDualSphere = "dualSphere" in entry && entry.dualSphere;

  if (entry.type === "talent" || entry.type === "feat") {
    // Primary sphere
    if (entry.sphere) {
      const isMultiSphere =
        hasDualSphere || userTags.some((id) => id.endsWith("-sphere"));
      if (options?.includeSphere || isMultiSphere) {
        tags.add(`${entry.sphere}-sphere`);
      }
    }
    // Dual sphere
    if ("dualSphere" in entry && entry.dualSphere) {
      tags.add(`${entry.dualSphere}-sphere`);
    }
  }

  return Array.from(tags).sort((a, b) => {
    const pA = tagMap.get(a)?.priority ?? 999;
    const pB = tagMap.get(b)?.priority ?? 999;
    return pA - pB || a.localeCompare(b);
  });
}
