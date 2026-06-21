import type { FeatEntry, TagEntry } from "./types";

type FeatCategoryInput = Pick<FeatEntry, "category" | "id" | "sphere" | "tags">;

function getFeatCategoryTagIds(
  feat: FeatCategoryInput,
  tagMap: Map<string, TagEntry>,
): string[] {
  return (feat.tags ?? [])
    .filter((tagId) => tagMap.get(tagId)?.featCategory === true)
    .sort((a, b) => {
      const pA = tagMap.get(a)?.priority ?? 999;
      const pB = tagMap.get(b)?.priority ?? 999;
      return pA - pB || a.localeCompare(b);
    });
}

export function getCanonicalFeatCategory(
  feat: FeatCategoryInput,
  tagMap: Map<string, TagEntry>,
): string {
  return (
    feat.category ??
    getFeatCategoryTagIds(feat, tagMap)[0] ??
    feat.sphere ??
    "general"
  );
}

export function getFeatUrl(
  feat: FeatCategoryInput & { system: string },
  tagMap: Map<string, TagEntry>,
): string {
  const category = getCanonicalFeatCategory(feat, tagMap);
  return `/${feat.system}/feats/${category}/${feat.id}/`;
}

export function getPathDerivedFeatUrl(
  feat: Pick<FeatEntry, "category" | "id" | "sphere" | "system">,
): string {
  const category = feat.category ?? feat.sphere ?? "general";
  return `/${feat.system}/feats/${category}/${feat.id}/`;
}
