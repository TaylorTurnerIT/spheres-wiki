import type {
  FeatEntry,
  SphereEntry,
  TalentCategory,
  TalentEntry,
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

  // 1. Prepare tier-specific lists (excluding 'base')
  const basicTalents = talents.filter((t) => t.tier === "basic");
  const advancedTalents = talents.filter((t) => t.tier === "advanced");

  // 2. Process Custom Category Definitions
  if (sphere.categoryDefinitions && sphere.categoryDefinitions.length > 0) {
    for (const def of sphere.categoryDefinitions) {
      const categoryEntries = filterEntries(
        def,
        basicTalents,
        advancedTalents,
        feats,
        usedIds,
      );
      if (categoryEntries.length > 0) {
        categories.push({
          label: def.label,
          id: def.label.toLowerCase().replace(/\s+/g, "-"),
          entries: categoryEntries.sort((a, b) => a.id.localeCompare(b.id)),
        });
      }
    }
  }

  // 3. Catch-all for Basic Talents
  const remainingBasic = basicTalents.filter((t) => !usedIds.has(t.id));
  if (remainingBasic.length > 0) {
    categories.push({
      label: "Basic Talents",
      id: "basic-talents",
      entries: remainingBasic
        .map((t) => ({ id: t.id, type: "talent" as const }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
  }

  // 4. Catch-all for Advanced Talents
  const remainingAdvanced = advancedTalents.filter((t) => !usedIds.has(t.id));
  if (remainingAdvanced.length > 0) {
    categories.push({
      label: "Advanced Talents",
      id: "advanced-talents",
      entries: remainingAdvanced
        .map((t) => ({ id: t.id, type: "talent" as const }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
  }

  // 5. Catch-all for Feats
  const remainingFeats = feats.filter((f) => !usedIds.has(f.id));
  if (remainingFeats.length > 0) {
    categories.push({
      label: "General Feats",
      id: "general-feats",
      entries: remainingFeats
        .map((f) => ({ id: f.id, type: "feat" as const }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
  }

  return categories;
}

export type SectionResult = {
  label: string;
  id: string;
  categories: CategoryResult[];
};

/**
 * Returns the effective tags for a talent or feat entry, including tags
 * that are auto-derived from entry fields (e.g. "dual-sphere" from the
 * dualSphere field). This mirrors tags.ts buildOrderedTagIds logic so
 * sectionDefinitions can filter on auto-injected tags.
 */
function getEffectiveTags(entry: TalentEntry | FeatEntry): Set<string> {
  const tags = new Set(entry.tags.map((t) => t.toLowerCase()));
  // dualSphere: "any" is still a dual-sphere feat (universal pairing) — it gets
  // the "dual-sphere" tag for TOC grouping, just no concrete {sphere}-sphere identity.
  if (entry.dualSphere != null && entry.dualSphere !== "") {
    tags.add("dual-sphere");
  }
  return tags;
}

function filterEntries(
  def: TalentCategory,
  basicTalents: TalentEntry[],
  advancedTalents: TalentEntry[],
  feats: FeatEntry[],
  usedIds: Set<string>,
): Array<{ id: string; type: "talent" | "feat" }> {
  const entries: Array<{ id: string; type: "talent" | "feat" }> = [];

  for (const t of basicTalents) {
    if (usedIds.has(t.id)) continue;
    const effTags = getEffectiveTags(t);
    const tierMatch = !def.tiers || def.tiers.includes("basic");
    const tagMatch = !def.tags || def.tags.some((tag) => effTags.has(tag));
    const excludeMatch = !def.excludeTags?.some((tag) => effTags.has(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: t.id, type: "talent" });
      usedIds.add(t.id);
    }
  }

  for (const t of advancedTalents) {
    if (usedIds.has(t.id)) continue;
    const effTags = getEffectiveTags(t);
    const tierMatch = !def.tiers || def.tiers.includes("advanced");
    const tagMatch = !def.tags || def.tags.some((tag) => effTags.has(tag));
    const excludeMatch = !def.excludeTags?.some((tag) => effTags.has(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: t.id, type: "talent" });
      usedIds.add(t.id);
    }
  }

  for (const f of feats) {
    if (usedIds.has(f.id)) continue;
    const effTags = getEffectiveTags(f);
    const tierMatch = !def.tiers || def.tiers.includes("feat");
    const tagMatch = !def.tags || def.tags.some((tag) => effTags.has(tag));
    const excludeMatch = !def.excludeTags?.some((tag) => effTags.has(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: f.id, type: "feat" });
      usedIds.add(f.id);
    }
  }

  return entries;
}

export function buildSections(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[],
): SectionResult[] {
  const sections: SectionResult[] = [];
  const usedIds = new Set<string>();

  const basicTalents = talents.filter((t) => t.tier === "basic");
  const advancedTalents = talents.filter((t) => t.tier === "advanced");

  if (sphere.sectionDefinitions && sphere.sectionDefinitions.length > 0) {
    for (const secDef of sphere.sectionDefinitions) {
      const secId = secDef.label.toLowerCase().replace(/\s+/g, "-");
      const categories: CategoryResult[] = [];

      if (secDef.categories && secDef.categories.length > 0) {
        for (const catDef of secDef.categories) {
          const catEntries = filterEntries(
            catDef,
            basicTalents,
            advancedTalents,
            feats,
            usedIds,
          );
          categories.push({
            label: catDef.label,
            id: catDef.label.toLowerCase().replace(/\s+/g, "-"),
            entries: catEntries.sort((a, b) => a.id.localeCompare(b.id)),
          });
        }
      }

      // Empty categories are included — page renders "No entries yet." for them
      sections.push({ label: secDef.label, id: secId, categories });
    }
  }

  // Catch-all: unmatched entries → "Other" section
  const remainingBasic = basicTalents.filter((t) => !usedIds.has(t.id));
  const remainingAdvanced = advancedTalents.filter((t) => !usedIds.has(t.id));
  const remainingFeats = feats.filter((f) => !usedIds.has(f.id));

  if (
    remainingBasic.length > 0 ||
    remainingAdvanced.length > 0 ||
    remainingFeats.length > 0
  ) {
    const otherCategories: CategoryResult[] = [];
    if (remainingBasic.length > 0) {
      otherCategories.push({
        label: "Basic Talents",
        id: "basic-talents",
        entries: remainingBasic
          .map((t) => ({ id: t.id, type: "talent" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    if (remainingAdvanced.length > 0) {
      otherCategories.push({
        label: "Advanced Talents",
        id: "advanced-talents",
        entries: remainingAdvanced
          .map((t) => ({ id: t.id, type: "talent" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    if (remainingFeats.length > 0) {
      otherCategories.push({
        label: "General Feats",
        id: "general-feats",
        entries: remainingFeats
          .map((f) => ({ id: f.id, type: "feat" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    sections.push({ label: "Other", id: "other", categories: otherCategories });
  }

  return sections;
}
