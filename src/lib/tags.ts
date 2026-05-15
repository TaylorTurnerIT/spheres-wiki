import type { AnyEntry, BookMeta, TagEntry } from "./types";

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: { includeSphere?: boolean },
): string[] {
  const tags = new Set<string>();

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

  if (
    options?.includeSphere &&
    (entry.type === "talent" || entry.type === "feat")
  ) {
    if (entry.sphere) tags.add(entry.sphere);
  }

  if ("tags" in entry && Array.isArray(entry.tags)) {
    for (const t of entry.tags) {
      tags.add(t.toLowerCase());
    }
  }

  return Array.from(tags).sort((a, b) => {
    const pA = tagMap.get(a)?.priority ?? 999;
    const pB = tagMap.get(b)?.priority ?? 999;
    return pA - pB || a.localeCompare(b);
  });
}
