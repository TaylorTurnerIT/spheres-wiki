import type {
  TalentEntry,
  FeatEntry,
  SphereEntry,
  TalentCategory,
} from "./types";

export type CategoryResult = {
  label: string;
  id: string;
  entries: Array<{ id: string; type: "talent" | "feat" }>;
};

export function buildCategories(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[],
): CategoryResult[] {
  const categories: CategoryResult[] = [];
  const usedIds = new Set<string>();

  // 1. Filter out 'base' talents entirely - they are shown at the top
  const basicTalents = talents.filter((t) => t.tier === "basic");
  const advancedTalents = talents.filter((t) => t.tier === "advanced");

  // 2. Process Custom Category Definitions
  if (sphere.categoryDefinitions && sphere.categoryDefinitions.length > 0) {
    for (const def of sphere.categoryDefinitions) {
      const categoryEntries: Array<{ id: string; type: "talent" | "feat" }> =
        [];

      // Only allow basic talents or feats in custom categories for now (Advanced is handled separately)
      for (const t of basicTalents) {
        if (usedIds.has(t.id)) continue;
        const tierMatch = !def.tiers || def.tiers.includes("basic");
        const tagMatch =
          !def.tags || def.tags.some((tag) => t.tags.includes(tag));
        const excludeMatch =
          !def.excludeTags ||
          !def.excludeTags.some((tag) => t.tags.includes(tag));
        if (tierMatch && tagMatch && excludeMatch) {
          categoryEntries.push({ id: t.id, type: "talent" });
          usedIds.add(t.id);
        }
      }

      for (const f of feats) {
        if (usedIds.has(f.id)) continue;
        const tierMatch = !def.tiers || def.tiers.includes("feat");
        const tagMatch =
          !def.tags || def.tags.some((tag) => f.tags.includes(tag));
        const excludeMatch =
          !def.excludeTags ||
          !def.excludeTags.some((tag) => f.tags.includes(tag));
        if (tierMatch && tagMatch && excludeMatch) {
          categoryEntries.push({ id: f.id, type: "feat" });
          usedIds.add(f.id);
        }
      }

      if (categoryEntries.length > 0) {
        categories.push({
          label: def.label,
          id: def.label.toLowerCase().replace(/\s+/g, "-"),
          entries: categoryEntries,
        });
      }
    }
  }

  // 3. Catch-all for Basic Talents
  const remainingBasic = basicTalents.filter((t) => !usedIds.has(t.id));
  if (remainingBasic.length > 0) {
    // If we already have some categories, use a sub-label, otherwise use the default
    const label = categories.some((c) => c.id.includes("talent"))
      ? "Other Basic Talents"
      : "Basic Talents";
    categories.push({
      label,
      id: "basic-talents",
      entries: remainingBasic.map((t) => ({ id: t.id, type: "talent" })),
    });
  }

  // 4. Advanced Talents (Always grouped together)
  if (advancedTalents.length > 0) {
    categories.push({
      label: "Advanced Talents",
      id: "advanced-talents",
      entries: advancedTalents.map((t) => ({ id: t.id, type: "talent" })),
    });
  }

  // 5. Catch-all for Feats
  const remainingFeats = feats.filter((f) => !usedIds.has(f.id));
  if (remainingFeats.length > 0) {
    const label = categories.some((c) => c.label.toLowerCase().includes("feat"))
      ? "Other Feats"
      : "Feats";
    categories.push({
      label,
      id: "feats",
      entries: remainingFeats.map((f) => ({ id: f.id, type: "feat" })),
    });
  }

  return categories;
}
