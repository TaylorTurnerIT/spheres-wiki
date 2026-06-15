import type { AnyEntry, BookMeta, TagEntry } from "./types";

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: {
    currentSphereId?: string;
    /** Show sphere identity tags (e.g. "alteration-sphere"). Superseded by includeSphere. */
    showHidden?: boolean;
    /** Alias for showHidden — show sphere identity tags. */
    includeSphere?: boolean;
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

  // 3pp
  const pub = bookMetaMap.get(entry.sourceBook)?.publisher;
  if (
    pub &&
    !["Drop Dead Studios", "Diamond Recreational Studios"].includes(pub)
  ) {
    tags.add("3pp");
  }

  // User tags
  for (const t of userTags) {
    tags.add(t);
  }

  // Dual-sphere logic — dualSphere field is single source of truth.
  // Auto-inject "dual-sphere" tag for TOC grouping (sectionDefinitions filter on it).
  // Skip injection for "any" (universal pairing — no TOC grouping needed).
  const hasDualSphere =
    "dualSphere" in entry && entry.dualSphere && entry.dualSphere !== "any";
  if (hasDualSphere) {
    tags.add("dual-sphere");
  }

  if (entry.type === "talent" || entry.type === "feat") {
    // Primary sphere tag — shown when explicitly requested or when multi-sphere context exists
    if (entry.sphere) {
      const showHidden = !!(options?.showHidden || options?.includeSphere);
      const isMultiSphere =
        hasDualSphere || userTags.some((id) => id.endsWith("-sphere"));
      if (showHidden || isMultiSphere) {
        tags.add(`${entry.sphere}-sphere`);
      }
    }
    // Dual sphere tag — always shown when dualSphere is set
    if (hasDualSphere && entry.dualSphere) {
      tags.add(`${entry.dualSphere}-sphere`);
    }
  }

  return Array.from(tags)
    .filter((id) => {
      if (options?.showHidden || options?.includeSphere) return true;
      // User-specified tags are always visible
      if (userTags.includes(id)) return true;
      const tagDef = tagMap.get(id);
      // Tags that have a definition file are visible (hidden flag controls visibility)
      if (tagDef) return tagDef.hidden !== true;
      // No definition file: hide auto-generated [sphere]-sphere tags by convention
      return !id.endsWith("-sphere");
    })
    .sort((a, b) => {
      const pA = tagMap.get(a)?.priority ?? 999;
      const pB = tagMap.get(b)?.priority ?? 999;
      return pA - pB || a.localeCompare(b);
    });
}
