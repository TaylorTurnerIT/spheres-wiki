import { describe, expect, it } from "vitest";
import {
  getCanonicalFeatCategory,
  getFeatUrl,
  getPathDerivedFeatUrl,
} from "../../src/lib/featCategories";
import type { FeatEntry, TagEntry } from "../../src/lib/types";

function makeFeat(overrides: Partial<FeatEntry> = {}): FeatEntry {
  return {
    type: "feat",
    id: "test-feat",
    system: "power",
    name: "Test Feat",
    sourceBook: "core",
    tags: [],
    ...overrides,
  };
}

function makeTag(overrides: Partial<TagEntry> = {}): TagEntry {
  return {
    type: "tag",
    id: "combat",
    label: "Combat",
    priority: 10,
    description: "Combat feats.",
    sourceBook: "__built-in__",
    featCategory: true,
    ...overrides,
  };
}

describe("getCanonicalFeatCategory", () => {
  it("prefers explicit frontmatter category over everything else", () => {
    const feat = makeFeat({ category: "explicit-category", tags: ["combat"], sphere: "fate" });
    const tagMap = new Map([["combat", makeTag()]]);
    expect(getCanonicalFeatCategory(feat, tagMap)).toBe("explicit-category");
  });

  it("falls back to the highest-priority featCategory tag", () => {
    const feat = makeFeat({ tags: ["combat", "champion"] });
    const tagMap = new Map([
      ["combat", makeTag({ id: "combat", priority: 20 })],
      ["champion", makeTag({ id: "champion", label: "Champion", priority: 5 })],
    ]);
    expect(getCanonicalFeatCategory(feat, tagMap)).toBe("champion");
  });

  it("falls back to sphere id when no category tag matches", () => {
    const feat = makeFeat({ tags: ["utility"], sphere: "fate" });
    const tagMap = new Map([["utility", makeTag({ id: "utility", featCategory: false })]]);
    expect(getCanonicalFeatCategory(feat, tagMap)).toBe("fate");
  });

  it("falls back to 'general' when nothing else applies", () => {
    const feat = makeFeat({ tags: [] });
    expect(getCanonicalFeatCategory(feat, new Map())).toBe("general");
  });
});

describe("getFeatUrl", () => {
  it("builds the canonical detail route from system/category/id", () => {
    const feat = makeFeat({ system: "might", category: "combat" });
    expect(getFeatUrl(feat, new Map())).toBe("/might/feats/combat/test-feat/");
  });

  it("derives category from tags when not set explicitly", () => {
    const feat = makeFeat({ system: "guile", tags: ["champion"] });
    const tagMap = new Map([["champion", makeTag({ id: "champion", label: "Champion" })]]);
    expect(getFeatUrl(feat, tagMap)).toBe("/guile/feats/champion/test-feat/");
  });

  it("never leaks a legacy or hash-based path shape", () => {
    const feat = makeFeat({ system: "power", sphere: "fate" });
    const path = getFeatUrl(feat, new Map());
    expect(path).toMatch(/^\/power\/feats\/[a-z0-9-]+\/test-feat\/$/);
  });
});

describe("getPathDerivedFeatUrl", () => {
  it("matches getFeatUrl's shape using only path-derivable fields", () => {
    const feat = { id: "test-feat", system: "champions", category: "combat" } as const;
    expect(getPathDerivedFeatUrl(feat)).toBe("/champions/feats/combat/test-feat/");
  });

  it("falls back to sphere then 'general' when category is absent", () => {
    expect(
      getPathDerivedFeatUrl({ id: "x", system: "power", sphere: "fate" }),
    ).toBe("/power/feats/fate/x/");
    expect(getPathDerivedFeatUrl({ id: "x", system: "power" })).toBe(
      "/power/feats/general/x/",
    );
  });
});
