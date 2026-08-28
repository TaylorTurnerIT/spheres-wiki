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

function claimedKey(type: "talent" | "feat", id: string): string {
  return `${type}:${id}`;
}

function claimMatching(
  def: TalentCategory,
  pool: Array<TalentEntry | FeatEntry>,
  tier: "basic" | "advanced" | "feat",
  type: "talent" | "feat",
  usedIds: Set<string>,
  entries: Array<{ id: string; type: "talent" | "feat" }>,
): void {
  for (const e of pool) {
    if (usedIds.has(claimedKey(type, e.id))) continue;
    const effTags = getEffectiveTags(e);
    const tierMatch = !def.tiers || def.tiers.includes(tier);
    const tagMatch =
      !def.tags || def.tags.some((tag) => effTags.has(tag.toLowerCase()));
    const excludeMatch = !def.excludeTags?.some((tag) =>
      effTags.has(tag.toLowerCase()),
    );
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: e.id, type });
      usedIds.add(claimedKey(type, e.id));
    }
  }
}

function filterEntries(
  def: TalentCategory,
  basicTalents: TalentEntry[],
  advancedTalents: TalentEntry[],
  feats: FeatEntry[],
  usedIds: Set<string>,
): Array<{ id: string; type: "talent" | "feat" }> {
  const entries: Array<{ id: string; type: "talent" | "feat" }> = [];
  claimMatching(def, basicTalents, "basic", "talent", usedIds, entries);
  claimMatching(def, advancedTalents, "advanced", "talent", usedIds, entries);
  claimMatching(def, feats, "feat", "feat", usedIds, entries);
  return entries;
}

function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

function buildDefinedSections(
  sphere: SphereEntry,
  basicTalents: TalentEntry[],
  advancedTalents: TalentEntry[],
  feats: FeatEntry[],
  usedIds: Set<string>,
): SectionResult[] {
  const sections: SectionResult[] = [];
  for (const secDef of sphere.sectionDefinitions ?? []) {
    // Empty categories are included — page renders "No entries yet." for them
    const categories = (secDef.categories ?? []).map((catDef) => {
      const catEntries = filterEntries(
        catDef,
        basicTalents,
        advancedTalents,
        feats,
        usedIds,
      );
      return {
        label: catDef.label,
        id: slugifyLabel(catDef.label),
        entries: catEntries.sort((a, b) => a.id.localeCompare(b.id)),
      };
    });
    sections.push({
      label: secDef.label,
      id: slugifyLabel(secDef.label),
      categories,
    });
  }
  return sections;
}

function toOtherCategory(
  label: string,
  entries: Array<TalentEntry | FeatEntry>,
  type: "talent" | "feat",
): CategoryResult | null {
  if (entries.length === 0) return null;
  return {
    label,
    id: slugifyLabel(label),
    entries: entries
      .map((e) => ({ id: e.id, type }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** Catch-all: unmatched entries → "Other" section */
function buildOtherSection(
  basicTalents: TalentEntry[],
  advancedTalents: TalentEntry[],
  feats: FeatEntry[],
  usedIds: Set<string>,
): SectionResult | null {
  const categories = [
    toOtherCategory(
      "Basic Talents",
      basicTalents.filter((t) => !usedIds.has(claimedKey("talent", t.id))),
      "talent",
    ),
    toOtherCategory(
      "Advanced Talents",
      advancedTalents.filter((t) => !usedIds.has(claimedKey("talent", t.id))),
      "talent",
    ),
    toOtherCategory(
      "General Feats",
      feats.filter((f) => !usedIds.has(claimedKey("feat", f.id))),
      "feat",
    ),
  ].filter((c): c is CategoryResult => c !== null);

  if (categories.length === 0) return null;
  return { label: "Other", id: "other", categories };
}

export function buildSections(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[],
): SectionResult[] {
  const usedIds = new Set<string>();
  const basicTalents = talents.filter((t) => t.tier === "basic");
  const advancedTalents = talents.filter((t) => t.tier === "advanced");

  const sections = buildDefinedSections(
    sphere,
    basicTalents,
    advancedTalents,
    feats,
    usedIds,
  );
  const other = buildOtherSection(
    basicTalents,
    advancedTalents,
    feats,
    usedIds,
  );
  if (other) sections.push(other);
  return sections;
}
