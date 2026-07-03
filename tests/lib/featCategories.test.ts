import { describe, expect, it } from "vitest";
import {
  getCanonicalFeatCategory,
  getFeatUrl,
  getPathDerivedFeatUrl,
} from "../../src/lib/featCategories";
import type { TagEntry } from "../../src/lib/types";

function makeTag(overrides: Partial<TagEntry> = {}): TagEntry {
  return {
    type: "tag",
    id: "combat",
    label: "Combat",
    priority: 1,
    description: "",
    sourceBook: "__built-in__",
    featCategory: true,
    ...overrides,
  };
}

describe("getCanonicalFeatCategory", () => {
  it("prefers an explicit category field", () => {
    const tagMap = new Map<string, TagEntry>();
    expect(
      getCanonicalFeatCategory({ category: "custom", id: "x", tags: [] }, tagMap),
    ).toBe("custom");
  });

  it("falls back to the highest-priority feat-category tag", () => {
    const tagMap = new Map<string, TagEntry>([
      ["combat", makeTag({ id: "combat", priority: 2 })],
      ["champion", makeTag({ id: "champion", priority: 1 })],
    ]);
    expect(
      getCanonicalFeatCategory({ id: "x", tags: ["combat", "champion"] }, tagMap),
    ).toBe("champion");
  });

  it("falls back to sphere, then to general", () => {
    const tagMap = new Map<string, TagEntry>();
    expect(getCanonicalFeatCategory({ id: "x", tags: [], sphere: "alteration" }, tagMap)).toBe(
      "alteration",
    );
    expect(getCanonicalFeatCategory({ id: "x", tags: [] }, tagMap)).toBe("general");
  });
});

describe("getFeatUrl / getPathDerivedFeatUrl", () => {
  const tagMap = new Map<string, TagEntry>([["combat", makeTag()]]);

  it("builds the canonical /{system}/feats/{category}/{feat}/ route", () => {
    const feat = { id: "severing-critical", system: "power", tags: ["combat"] };
    expect(getFeatUrl(feat, tagMap)).toBe("/power/feats/combat/severing-critical/");
  });

  it("matches the canonical route for sphere-focused feats with no category tag", () => {
    const feat = { id: "ability-channel", system: "power", tags: [], sphere: "conjuration" };
    expect(getFeatUrl(feat, tagMap)).toBe("/power/feats/conjuration/ability-channel/");
  });

  it("getPathDerivedFeatUrl agrees with getFeatUrl when no tag lookup is available", () => {
    const feat = { id: "severing-critical", system: "power", category: "combat" };
    expect(getPathDerivedFeatUrl(feat)).toBe(getFeatUrl({ ...feat, tags: [] }, tagMap));
  });

  it("never emits a bare/legacy path — always system-scoped and category-scoped", () => {
    const feat = { id: "shared-magic", system: "power", tags: [] };
    const href = getFeatUrl(feat, tagMap);
    expect(href).toMatch(/^\/power\/feats\/[a-z0-9-]+\/shared-magic\/$/);
  });
});
