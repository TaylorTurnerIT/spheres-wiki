import { describe, expect, it } from "vitest";
import {
  type BrowseRowData,
  type BrowseState,
  compareLetters,
  EMPTY_STATE,
  parseBrowseParams,
  rowMatches,
  rowPassesFilters,
  rowPassesQuery,
  serializeBrowseParams,
} from "../../src/lib/browseFilter";

const row: BrowseRowData = {
  name: "counterspell ability",
  search: "counterspell power destruction",
  system: "power",
  category: "counterspell",
  tags: ["counterspell", "feat"],
  href: "/power/feats/counterspell/x/",
};

function state(overrides: Partial<BrowseState> = {}): BrowseState {
  return { ...EMPTY_STATE, ...overrides };
}

describe("parse/serialize browse params", () => {
  it("round-trips full state", () => {
    const s = state({ q: "ability", system: "power", category: "counterspell", tags: ["a", "b"], desc: true });
    const qs = serializeBrowseParams(s);
    expect(parseBrowseParams(`?${qs}`)).toEqual(s);
  });
  it("omits empty fields", () => {
    expect(serializeBrowseParams(EMPTY_STATE)).toBe("");
  });
  it("only encodes desc when enabled", () => {
    expect(serializeBrowseParams(state({ desc: false }))).toBe("");
    expect(serializeBrowseParams(state({ desc: true }))).toContain("desc=1");
  });
});

describe("rowPassesFilters", () => {
  it("passes with no filters", () => {
    expect(rowPassesFilters(row, EMPTY_STATE)).toBe(true);
  });
  it("filters by system, category, and tags (AND)", () => {
    expect(rowPassesFilters(row, state({ system: "might" }))).toBe(false);
    expect(rowPassesFilters(row, state({ category: "counterspell" }))).toBe(true);
    expect(rowPassesFilters(row, state({ tags: ["counterspell", "feat"] }))).toBe(true);
    expect(rowPassesFilters(row, state({ tags: ["missing"] }))).toBe(false);
  });
});

describe("rowPassesQuery", () => {
  it("matches name substring case-insensitively", () => {
    expect(rowPassesQuery(row, state({ q: "Ability" }), null)).toBe(true);
  });
  it("matches secondary metadata", () => {
    expect(rowPassesQuery(row, state({ q: "destruction" }), null)).toBe(true);
  });
  it("only matches body text when desc mode is on", () => {
    const desc = { "/power/feats/counterspell/x/": "hidden body keyword" };
    expect(rowPassesQuery(row, state({ q: "keyword" }), desc)).toBe(false);
    expect(rowPassesQuery(row, state({ q: "keyword", desc: true }), desc)).toBe(true);
  });
});

describe("rowMatches", () => {
  it("requires both filters and query to pass", () => {
    expect(rowMatches(row, state({ q: "ability", system: "power" }), null)).toBe(true);
    expect(rowMatches(row, state({ q: "ability", system: "might" }), null)).toBe(false);
  });
});

describe("compareLetters", () => {
  it("sorts alphabetically with # last", () => {
    expect(["#", "B", "A"].sort(compareLetters)).toEqual(["A", "B", "#"]);
  });
});
