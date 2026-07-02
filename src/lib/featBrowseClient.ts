import type { FeatBrowseEntry } from "./featBrowse";

export type FeatBrowseFilters = {
  q: string;
  system: string;
  category: string;
};

const DEFAULT_FILTERS: FeatBrowseFilters = { q: "", system: "", category: "" };

/** Reads feats-browse state (search + filters) from a `location.search`-style string. */
export function parseFeatBrowseParams(search: string): FeatBrowseFilters {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") ?? "",
    system: params.get("system") ?? "",
    category: params.get("category") ?? "",
  };
}

/** Builds a shareable `?q=...&system=...&category=...` query string (empty fields omitted). */
export function buildFeatBrowseSearch(filters: Partial<FeatBrowseFilters>): string {
  const merged = { ...DEFAULT_FILTERS, ...filters };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.system) params.set("system", merged.system);
  if (merged.category) params.set("category", merged.category);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAny(values: string[], q: string): boolean {
  return values.some((v) => normalize(v).includes(q));
}

function facetValues(entry: FeatBrowseEntry): string[] {
  return [entry.categoryLabel, entry.sphere ?? "", ...entry.tags];
}

function bodyValues(entry: FeatBrowseEntry): string[] {
  return [entry.excerpt, entry.prerequisites ?? ""];
}

function metaValues(entry: FeatBrowseEntry): string[] {
  return [entry.sourceBookTitle, entry.system];
}

/**
 * Ranks a query match against an entry — lower is a stronger match, `undefined` is no match.
 * Tiers follow the spec's search-ranking order: exact title, prefix title,
 * tag/category/sphere, body text (excerpt/prerequisites), then other metadata.
 */
function rankEntry(entry: FeatBrowseEntry, query: string): number | undefined {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(entry.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q) || matchesAny(facetValues(entry), q)) return 2;
  if (matchesAny(bodyValues(entry), q)) return 3;
  if (matchesAny(metaValues(entry), q)) return 4;
  return undefined;
}

/** True if the entry matches the given free-text query under the same rules as `filterFeatEntries`. */
export function matchesQuery(entry: FeatBrowseEntry, query: string): boolean {
  return rankEntry(entry, query) !== undefined;
}

/**
 * Filters (system/category) then ranks+sorts by query relevance. Entries with
 * no match to a non-empty query are dropped. Stable-sorts within a rank tier,
 * so row order stays deterministic while typing (per spec §7.2).
 */
export function filterFeatEntries(
  entries: FeatBrowseEntry[],
  filters: { q?: string; system?: string; category?: string },
): FeatBrowseEntry[] {
  const q = filters.q?.trim() ?? "";
  const system = filters.system ?? "";
  const category = filters.category ?? "";

  const scoped = entries.filter((entry) => {
    if (system && entry.system !== system) return false;
    if (category && entry.category !== category) return false;
    return true;
  });

  if (!q) return scoped;

  return scoped
    .map((entry) => ({ entry, rank: rankEntry(entry, q) }))
    .filter((x): x is { entry: FeatBrowseEntry; rank: number } => x.rank !== undefined)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.entry);
}

export type CategoryOption = { id: string; label: string; count: number };

/** Unique categories present in `entries` (already scoped to a system), with counts, most-common first. */
export function getCategoryOptions(entries: FeatBrowseEntry[]): CategoryOption[] {
  const counts = new Map<string, CategoryOption>();
  for (const entry of entries) {
    const existing = counts.get(entry.category);
    if (existing) existing.count += 1;
    else counts.set(entry.category, { id: entry.category, label: entry.categoryLabel, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Hover prefetch is only worth it once the visible result set is small enough to be a "modest" set. */
export function shouldPrefetch(resultCount: number, threshold = 60): boolean {
  return resultCount > 0 && resultCount <= threshold;
}
