import type { AnyEntry, BookMeta, TagEntry } from "./types";

type SphereTagOptions = {
  currentSphereId?: string;
  /** Show sphere identity tags (e.g. "alteration-sphere"). Superseded by includeSphere. */
  showHidden?: boolean;
  /** Alias for showHidden — show sphere identity tags. */
  includeSphere?: boolean;
};

/** Static entry-type → auto-tag mapping. Tier tags are 1:1 (tier name = tag id). */
const ENTRY_TYPE_AUTO_TAGS: Partial<Record<AnyEntry["type"], string>> = {
  talent: "talent",
  feat: "feat",
  sphere: "sphere",
  "class-trait": "class-trait",
};

const TALENT_TIER_TAGS = new Set(["base", "basic", "advanced"]);

/** Publishers whose content is never flagged "3pp" (3rd-party publisher). */
const NON_3PP_PUBLISHERS = new Set([
  "Drop Dead Studios",
  "Diamond Recreational Studios",
]);

function lowerUserTags(entry: AnyEntry): string[] {
  return "tags" in entry && Array.isArray(entry.tags)
    ? entry.tags.map((t) => t.toLowerCase())
    : [];
}

/** Entry-type tag + talent tier tag (e.g. "talent" + "basic"). */
function getEntryTypeAndTierTags(entry: AnyEntry): string[] {
  const tags: string[] = [];
  const typeTag = ENTRY_TYPE_AUTO_TAGS[entry.type];
  if (typeTag) tags.push(typeTag);
  if (entry.type === "talent" && entry.tier && TALENT_TIER_TAGS.has(entry.tier)) {
    tags.push(entry.tier);
  }
  return tags;
}

/** "3pp" tag iff the entry's source book's publisher isn't a known in-house publisher. */
function get3ppTag(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
): string | undefined {
  const pub = bookMetaMap.get(entry.sourceBook)?.publisher;
  return pub && !NON_3PP_PUBLISHERS.has(pub) ? "3pp" : undefined;
}

// Dual-sphere logic — dualSphere field is single source of truth. "any" means
// universal pairing (works with any second sphere) and still counts as
// dual-sphere — it just doesn't get a concrete {sphere}-sphere identity tag.
function hasDualSphereField(entry: AnyEntry): boolean {
  return (
    "dualSphere" in entry && entry.dualSphere != null && entry.dualSphere !== ""
  );
}

/** Primary sphere tag — shown when explicitly requested or in multi-sphere context. */
function getPrimarySphereTag(
  entry: AnyEntry & { sphere?: string },
  isDualSphere: boolean,
  userTags: string[],
  options?: SphereTagOptions,
): string | undefined {
  if (!entry.sphere) return undefined;
  const showHidden = !!(options?.showHidden || options?.includeSphere);
  const isMultiSphere =
    isDualSphere || userTags.some((id) => id.endsWith("-sphere"));
  return showHidden || isMultiSphere ? `${entry.sphere}-sphere` : undefined;
}

/** Dual sphere identity tag — shown when dualSphere is set to a concrete sphere. */
function getDualSphereIdentityTag(
  entry: AnyEntry & { dualSphere?: string },
  isDualSphere: boolean,
): string | undefined {
  return isDualSphere && entry.dualSphere && entry.dualSphere !== "any"
    ? `${entry.dualSphere}-sphere`
    : undefined;
}

/** Sphere identity tags ("{sphere}-sphere") for talents/feats, when shown. */
function getSphereIdentityTags(
  entry: AnyEntry,
  isDualSphere: boolean,
  userTags: string[],
  options?: SphereTagOptions,
): string[] {
  if (entry.type !== "talent" && entry.type !== "feat") return [];
  const tags: string[] = [];
  const primary = getPrimarySphereTag(entry, isDualSphere, userTags, options);
  if (primary) tags.push(primary);
  const dual = getDualSphereIdentityTag(entry, isDualSphere);
  if (dual) tags.push(dual);
  return tags;
}

/**
 * Computes the system-derived auto-tags for an entry: entry-type tag, tier tag,
 * 3pp flag, and dual-sphere identity tags. Does not include user-authored tags
 * (see `buildOrderedTagIds`, which merges both before sorting/filtering).
 */
export function getSystemAutoTags(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  options?: SphereTagOptions,
): Set<string> {
  const tags = new Set<string>();
  const userTags = lowerUserTags(entry);
  const isDualSphere = hasDualSphereField(entry);

  for (const t of getEntryTypeAndTierTags(entry)) tags.add(t);

  const ppTag = get3ppTag(entry, bookMetaMap);
  if (ppTag) tags.add(ppTag);

  if (isDualSphere) tags.add("dual-sphere");

  for (const t of getSphereIdentityTags(entry, isDualSphere, userTags, options)) {
    tags.add(t);
  }

  return tags;
}

/**
 * Filters tags for visibility (hidden defs, sphere-identity convention,
 * user-tag overrides) and sorts the remainder by `tagMap` priority, then
 * alphabetically.
 */
export function sortTagsByPriority(
  tagIds: string[],
  tagMap: Map<string, TagEntry>,
  userTags: string[],
  options?: Pick<SphereTagOptions, "showHidden" | "includeSphere">,
): string[] {
  return tagIds
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

export function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: SphereTagOptions,
): string[] {
  const userTags = lowerUserTags(entry);
  const autoTags = getSystemAutoTags(entry, bookMetaMap, options);
  const allTags = new Set([...autoTags, ...userTags]);
  return sortTagsByPriority(Array.from(allTags), tagMap, userTags, options);
}
