import { describe, expect, it } from "vitest";
import type { FeatBrowseEntry } from "../../src/lib/featBrowse";
import {
  buildFeatBrowseSearch,
  filterFeatEntries,
  getCategoryOptions,
  matchesQuery,
  parseFeatBrowseParams,
  shouldPrefetch,
} from "../../src/lib/featBrowseClient";

function makeEntry(overrides: Partial<FeatBrowseEntry> = {}): FeatBrowseEntry {
  return {
    id: "test-feat",
    key: "core:test-feat",
    name: "Test Feat",
    href: "/power/feats/general/test-feat/",
    system: "power",
    category: "general",
    categoryLabel: "General",
    sourceBook: "core",
    sourceBookTitle: "Core Book",
    tags: ["feat"],
    excerpt: "Does a thing.",
    ...overrides,
  };
}

describe("parseFeatBrowseParams / buildFeatBrowseSearch", () => {
  it("round-trips search + system + category through the URL", () => {
    const search = buildFeatBrowseSearch({ q: "sneak attack", system: "guile", category: "combat" });
    expect(search).toBe("?q=sneak+attack&system=guile&category=combat");
    expect(parseFeatBrowseParams(search)).toEqual({
      q: "sneak attack",
      system: "guile",
      category: "combat",
    });
  });

  it("omits empty fields from the query string", () => {
    expect(buildFeatBrowseSearch({ q: "", system: "power", category: "" })).toBe("?system=power");
    expect(buildFeatBrowseSearch({})).toBe("");
  });

  it("parses missing params as empty strings, never hash state", () => {
    expect(parseFeatBrowseParams("")).toEqual({ q: "", system: "", category: "" });
    expect(parseFeatBrowseParams("?q=fire")).toEqual({ q: "fire", system: "", category: "" });
  });
});

describe("filterFeatEntries / matchesQuery", () => {
  const entries = [
    makeEntry({ id: "a", name: "Sneak Attack", system: "power", category: "combat", categoryLabel: "Combat" }),
    makeEntry({ id: "b", name: "Improved Sneak Attack", system: "might", category: "combat", categoryLabel: "Combat" }),
    makeEntry({ id: "c", name: "Firebolt Mastery", system: "power", category: "general", categoryLabel: "General", tags: ["feat", "fire"] }),
    makeEntry({ id: "d", name: "Champion's Resolve", system: "champions", category: "champion", categoryLabel: "Champion", excerpt: "Grants fire resistance." }),
  ];

  it("filters by system only", () => {
    const result = filterFeatEntries(entries, { system: "power" });
    expect(result.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("filters by category only", () => {
    const result = filterFeatEntries(entries, { category: "combat" });
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("composes system and category filters", () => {
    const result = filterFeatEntries(entries, { system: "might", category: "combat" });
    expect(result.map((e) => e.id)).toEqual(["b"]);
  });

  it("ranks exact and prefix name matches above tag/body matches", () => {
    const result = filterFeatEntries(entries, { q: "sneak attack" });
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("matches tag/category and body text for a query not in any title", () => {
    const result = filterFeatEntries(entries, { q: "fire" });
    expect(result.map((e) => e.id).sort()).toEqual(["c", "d"]);
  });

  it("drops entries with zero match to a non-empty query", () => {
    const result = filterFeatEntries(entries, { q: "nonexistent-keyword-zzz" });
    expect(result).toEqual([]);
  });

  it("returns everything (in original order) for an empty query", () => {
    const result = filterFeatEntries(entries, { q: "" });
    expect(result.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("matchesQuery agrees with filterFeatEntries per-entry", () => {
    expect(matchesQuery(entries[0], "sneak")).toBe(true);
    expect(matchesQuery(entries[0], "nonexistent-keyword-zzz")).toBe(false);
  });
});

describe("getCategoryOptions", () => {
  it("counts unique categories, most common first", () => {
    const entries = [
      makeEntry({ category: "combat", categoryLabel: "Combat" }),
      makeEntry({ category: "combat", categoryLabel: "Combat" }),
      makeEntry({ category: "general", categoryLabel: "General" }),
    ];
    expect(getCategoryOptions(entries)).toEqual([
      { id: "combat", label: "Combat", count: 2 },
      { id: "general", label: "General", count: 1 },
    ]);
  });

  it("returns an empty list for an empty entry set", () => {
    expect(getCategoryOptions([])).toEqual([]);
  });
});

describe("shouldPrefetch", () => {
  it("allows prefetch for a modest result count", () => {
    expect(shouldPrefetch(12)).toBe(true);
    expect(shouldPrefetch(60)).toBe(true);
  });

  it("disables prefetch for a large catalog result count", () => {
    expect(shouldPrefetch(61)).toBe(false);
    expect(shouldPrefetch(1287)).toBe(false);
  });

  it("disables prefetch when there are zero results", () => {
    expect(shouldPrefetch(0)).toBe(false);
  });
});
