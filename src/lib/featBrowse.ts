/**
 * Feat browse manifest builder.
 *
 * Produces the lightweight, deterministic metadata rows that drive the
 * `/feats/` catalog table (spec §4.1). Intentionally body-free: the browse
 * surface never renders feat prose, so this manifest carries only what the
 * table and its client-side filter need. Full body text is served separately
 * and lazily by the `search-text.json` endpoint (see `buildFeatSearchText`).
 *
 * The shape is entry-type-neutral enough to be reused by future browse pages
 * (talents, archetypes) — `BrowseTable.astro` consumes `FeatBrowseRow` through
 * a generic row contract, not feat-specific fields.
 */
import { SYSTEMS } from "@/config/site";
import { contentEntryKey } from "@/lib/entryIdentity";
import { getCanonicalFeatCategory, getFeatUrl } from "@/lib/featCategories";
import { systemCssKey, systemIdKey } from "@/lib/systems";
import { buildOrderedTagIds } from "@/lib/tags";
import type { BookMeta, FeatEntry, SphereEntry, TagEntry } from "@/lib/types";
import { url } from "@/lib/url";

export interface FeatBrowseRow {
  /** Unique row key — the canonical href, guaranteed distinct per feat. */
  key: string;
  id: string;
  name: string;
  system: string;
  /** CSS namespace key (power|might|guile|champ) for `--clr-ns` coloring. */
  cssKey: string;
  category: string;
  categoryLabel: string;
  sphere: string;
  sphereLabel: string;
  sourceBook: string;
  sourceBookTitle: string;
  tags: string[];
  prerequisites: string;
  summary: string;
  href: string;
}

/** Maps this builder reads — a structural subset of `ResolvedMaps`. */
interface BrowseMaps {
  featMap: Map<string, FeatEntry>;
  tagMap: Map<string, TagEntry>;
  bookMetaMap: Map<string, BookMeta>;
  sphereMap: Map<string, SphereEntry>;
}

/** Strip inline markdown (links, emphasis) to plain text for a table cell. */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((?:[^()\\]|\\.|\([^()]*\))*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull the plain-text prerequisites line out of a feat body.
 * Feats declare prerequisites as a `**Prerequisites:** …` paragraph; returns
 * an empty string when the feat has none.
 */
export function extractPrerequisites(body: string | undefined): string {
  if (!body) return "";
  const match = body.match(
    /(?:^|\n)\*\*Prerequisites?:\*\*\s*([\s\S]*?)(?=\n\s*\n|\n\*\*[^*\n]+:\*\*|$)/i,
  );
  return match ? stripMarkdownInline(match[1]) : "";
}

/** Flatten a whole feat body to lowercase plain text for description search. */
export function bodyToSearchText(body: string | undefined): string {
  if (!body) return "";
  return stripMarkdownInline(body.replace(/[#>-]/g, " ")).toLowerCase();
}

function collEntryFor(
  feat: FeatEntry,
  collEntriesMap: Map<string, { body?: string }>,
): { body?: string } | undefined {
  return collEntriesMap.get(contentEntryKey("feat", feat.system, feat.id));
}

function browsableFeats(maps: BrowseMaps): FeatEntry[] {
  return [...maps.featMap.values()]
    .filter((feat) => SYSTEMS[feat.system])
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function categoryLabelFor(
  category: string,
  system: string,
  maps: BrowseMaps,
): string {
  return (
    maps.sphereMap.get(systemIdKey(system, category))?.name ??
    maps.tagMap.get(category)?.label ??
    category
  );
}

function sphereLabelFor(
  sphere: string,
  system: string,
  maps: BrowseMaps,
): string {
  if (!sphere) return "";
  return maps.sphereMap.get(systemIdKey(system, sphere))?.name ?? sphere;
}

/** Map a single feat entry to its body-free browse row. */
function featToBrowseRow(
  feat: FeatEntry,
  maps: BrowseMaps,
  collEntriesMap: Map<string, { body?: string }>,
): FeatBrowseRow {
  const category = getCanonicalFeatCategory(feat, maps.tagMap);
  const href = url(getFeatUrl(feat, maps.tagMap));
  const sphere = feat.sphere ?? "";
  return {
    key: href,
    id: feat.id,
    name: feat.name,
    system: feat.system,
    cssKey: systemCssKey(feat.system),
    category,
    categoryLabel: categoryLabelFor(category, feat.system, maps),
    sphere,
    sphereLabel: sphereLabelFor(sphere, feat.system, maps),
    sourceBook: feat.sourceBook,
    sourceBookTitle:
      maps.bookMetaMap.get(feat.sourceBook)?.title ?? feat.sourceBook,
    tags: buildOrderedTagIds(feat, maps.bookMetaMap, maps.tagMap, {
      showHidden: !!(feat.dualSphere && feat.dualSphere !== "any"),
    }),
    prerequisites: extractPrerequisites(
      collEntryFor(feat, collEntriesMap)?.body,
    ),
    summary: feat.summary ?? "",
    href,
  };
}

/** Build the deterministic, body-free browse manifest for every routed feat. */
export function buildFeatBrowseRows(
  maps: BrowseMaps,
  collEntriesMap: Map<string, { body?: string }>,
): FeatBrowseRow[] {
  return browsableFeats(maps).map((feat) =>
    featToBrowseRow(feat, maps, collEntriesMap),
  );
}

/**
 * Build the lazy description-search text map: href → lowercase plain body.
 * Served by the `search-text.json` endpoint so no feat body text ships in the
 * initial page HTML (spec §4.3).
 */
export function buildFeatSearchText(
  maps: BrowseMaps,
  collEntriesMap: Map<string, { body?: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const feat of browsableFeats(maps)) {
    const href = url(getFeatUrl(feat, maps.tagMap));
    out[href] = bodyToSearchText(collEntryFor(feat, collEntriesMap)?.body);
  }
  return out;
}

/** Distinct category options, ordered by tag priority then label. */
export function featCategoryOptions(
  rows: FeatBrowseRow[],
  tagMap: Map<string, TagEntry>,
): { value: string; text: string }[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!seen.has(row.category)) seen.set(row.category, row.categoryLabel);
  }
  return [...seen.entries()]
    .map(([value, text]) => ({ value, text }))
    .sort((a, b) => {
      const pa = tagMap.get(a.value)?.priority ?? 999;
      const pb = tagMap.get(b.value)?.priority ?? 999;
      return pa - pb || a.text.localeCompare(b.text);
    });
}

/** Distinct system options in `SYSTEMS` registry order. */
export function featSystemOptions(
  rows: FeatBrowseRow[],
): { value: string; text: string }[] {
  const present = new Set(rows.map((r) => r.system));
  return Object.entries(SYSTEMS)
    .filter(([id]) => present.has(id))
    .map(([id, sys]) => ({ value: id, text: sys.label }));
}

/** Distinct tag options carried by the feats, ordered by tag priority. */
export function featTagOptions(
  rows: FeatBrowseRow[],
  tagMap: Map<string, TagEntry>,
): { value: string; text: string }[] {
  const seen = new Set<string>();
  for (const row of rows) for (const tag of row.tags) seen.add(tag);
  return [...seen]
    .map((value) => ({ value, text: tagMap.get(value)?.label ?? value }))
    .sort((a, b) => {
      const pa = tagMap.get(a.value)?.priority ?? 999;
      const pb = tagMap.get(b.value)?.priority ?? 999;
      return pa - pb || a.text.localeCompare(b.text);
    });
}
