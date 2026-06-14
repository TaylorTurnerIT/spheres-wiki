import type { AnyEntry, BookMeta, TagEntry } from "./types";

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: {
    currentSphereId?: string;
    showHidden?: boolean;
  },
): string[] {
  const tags = new Set<string>();
  const userTags =
    "tags" in entry && Array.isArray(entry.tags)
      ? entry.tags.map((t) => t.toLowerCase())
      : [];

  // Entry-type tags
  if (entry.type === "talent") tags.add("talent");
  if (entry.type === "feat") tags.add("feat");
  if (entry.type === "sphere") tags.add("sphere");
  if (entry.type === "class-trait") tags.add("class-trait");

  // Tier tags
  if (entry.type === "talent" && entry.tier) {
    if (entry.tier === "base") tags.add("base");
    else if (entry.tier === "basic") tags.add("basic");
    else if (entry.tier === "advanced") tags.add("advanced");
  }

  // System auto-tag
  if ("system" in entry && entry.system) tags.add(entry.system);

  // 3pp
  const pub = bookMetaMap.get(entry.sourceBook)?.publisher;
  if (pub && !["Drop Dead Studios", "Diamond Recreational Studios"].includes(pub)) {
    tags.add("3pp");
  }

  // User tags
  for (const t of userTags) tags.add(t);

  // Dual-sphere
  const hasDualSphere =
    "dualSphere" in entry && entry.dualSphere && entry.dualSphere !== "any";
  if (hasDualSphere) tags.add("dual-sphere");

  // Sphere identity tags — always added; hidden filtering controls visibility
  if (entry.type === "talent" || entry.type === "feat") {
    if (entry.sphere) tags.add(`${entry.sphere}-sphere`);
    if ("dualSphere" in entry && entry.dualSphere) tags.add(`${entry.dualSphere}-sphere`);
  }

  return Array.from(tags)
    .filter((id) => {
      if (options?.showHidden) return true;
      const tagDef = tagMap.get(id);
      if (tagDef?.hidden !== undefined) return !tagDef.hidden;
      // No definition file: hide [sphere]-sphere tags by convention
      return !id.endsWith("-sphere");
    })
    .sort((a, b) => {
      const pA = tagMap.get(a)?.priority ?? 999;
      const pB = tagMap.get(b)?.priority ?? 999;
      return pA - pB || a.localeCompare(b);
    });
}
