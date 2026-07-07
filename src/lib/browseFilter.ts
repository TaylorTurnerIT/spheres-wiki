/**
 * Pure browse-filter logic — URL state (de)serialization and per-row matching.
 *
 * Kept DOM-free and separate from `browseFilterClient.ts` so it is unit-testable
 * and reusable by any catalog browse page. The client module is a thin adapter
 * that reads these decisions off the live DOM.
 */

export interface BrowseState {
  q: string;
  system: string;
  category: string;
  tags: string[];
  desc: boolean;
}

/** The subset of a row the matcher inspects (all lowercase where relevant). */
export interface BrowseRowData {
  name: string;
  search: string;
  system: string;
  category: string;
  tags: string[];
  href: string;
}

export const EMPTY_STATE: BrowseState = {
  q: "",
  system: "",
  category: "",
  tags: [],
  desc: false,
};

/** Parse a `location.search` string into browse state. */
export function parseBrowseParams(search: string): BrowseState {
  const p = new URLSearchParams(search);
  const tags = (p.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    q: p.get("q") ?? "",
    system: p.get("system") ?? "",
    category: p.get("category") ?? "",
    tags,
    desc: p.get("desc") === "1",
  };
}

/** Serialize browse state to a query string (without a leading `?`). */
export function serializeBrowseParams(state: BrowseState): string {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.system) p.set("system", state.system);
  if (state.category) p.set("category", state.category);
  if (state.tags.length) p.set("tags", state.tags.join(","));
  if (state.desc) p.set("desc", "1");
  return p.toString();
}

/** Do the discrete (system/category/tags) filters admit this row? */
export function rowPassesFilters(row: BrowseRowData, state: BrowseState): boolean {
  if (state.system && row.system !== state.system) return false;
  if (state.category && row.category !== state.category) return false;
  return state.tags.every((t) => row.tags.includes(t));
}

/** Does the text query match this row (name/metadata, plus body when enabled)? */
export function rowPassesQuery(
  row: BrowseRowData,
  state: BrowseState,
  descText: Record<string, string> | null,
): boolean {
  if (!state.q) return true;
  const q = state.q.toLowerCase();
  if (row.name.includes(q) || row.search.includes(q)) return true;
  if (state.desc && descText) return (descText[row.href] ?? "").includes(q);
  return false;
}

/** Full match: discrete filters AND the text query. */
export function rowMatches(
  row: BrowseRowData,
  state: BrowseState,
  descText: Record<string, string> | null,
): boolean {
  return rowPassesFilters(row, state) && rowPassesQuery(row, state, descText);
}

/** Alphabetical letter-group comparator; the "#" bucket sorts last. */
export function compareLetters(a: string, b: string): number {
  if (a === "#") return 1;
  if (b === "#") return -1;
  return a.localeCompare(b);
}
