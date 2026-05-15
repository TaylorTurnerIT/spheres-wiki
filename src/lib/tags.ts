import type { AnyEntry, BookMeta, TagEntry } from "./types";

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: { includeSphere?: boolean },
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

  // Primary sphere logic: show if includeSphere is true, OR if there are other sphere tags present
  const isSphereTag = (id: string) => {
    const t = tagMap.get(id);
    return (
      t?.sourceBook === "__builtin__" &&
      t?.description?.includes("Associated with the")
    );
  };

  const hasOtherSpheres = userTags.some(isSphereTag);

  if (entry.type === "talent" || entry.type === "feat") {
    if (entry.sphere && (options?.includeSphere || hasOtherSpheres)) {
      tags.add(entry.sphere);
    }
  }

  return Array.from(tags).sort((a, b) => {
    const pA = tagMap.get(a)?.priority ?? 999;
    const pB = tagMap.get(b)?.priority ?? 999;
    return pA - pB || a.localeCompare(b);
  });
}
