import { describe, it, expect } from "vitest";
import {
  buildOrderedTagIds,
  getSystemAutoTags,
  sortTagsByPriority,
} from "../../src/lib/tags";
import type { AnyEntry, BookMeta, TagEntry } from "../../src/lib/types";

function makeBookMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    slug: "test-book",
    title: "Test Book",
    publisher: "Drop Dead Studios",
    publishedDate: "2020-01-01",
    ...overrides,
  };
}

function makeTag(id: string, priority: number): TagEntry {
  return {
    type: "tag",
    id,
    label: id,
    priority,
    description: `${id} tag.`,
    sourceBook: "test-book",
  };
}

const bookMetaMap = new Map<string, BookMeta>([
  [
    "drop-dead",
    makeBookMeta({ slug: "drop-dead", publisher: "Drop Dead Studios" }),
  ],
  [
    "diamond",
    makeBookMeta({
      slug: "diamond",
      publisher: "Diamond Recreational Studios",
    }),
  ],
  [
    "third-party-book",
    makeBookMeta({ slug: "third-party-book", publisher: "Some Third Party" }),
  ],
]);

const tagMap = new Map<string, TagEntry>([
  ["talent", makeTag("talent", -10)],
  ["feat", makeTag("feat", -10)],
  ["sphere", makeTag("sphere", -10)],
  ["base", makeTag("base", -9)],
  ["basic", makeTag("basic", -9)],
  ["advanced", makeTag("advanced", -9)],
  ["3pp", makeTag("3pp", -9)],
  ["combat", makeTag("combat", 5)],
  ["utility", makeTag("utility", 10)],
  ["metamagic", makeTag("metamagic", 15)],
  ["alteration-sphere", makeTag("alteration-sphere", 50)],
  ["death-sphere", makeTag("death-sphere", 50)],
  ["ex", makeTag("ex", 20)],
  ["su", makeTag("su", 20)],
  ["sp", makeTag("sp", 20)],
]);

// ─── Talent tags ────────────────────────────────────────────────────────────

describe("buildOrderedTagIds — talents", () => {
  it('adds "talent" and tier tag for basic talent', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "test-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Test Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("talent");
    expect(result).toContain("basic");
    expect(result).not.toContain("feat");
    expect(result).not.toContain("advanced");
  });

  it('adds "base" tag for base-tier talent', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "base-talent",
      sphere: "alteration",
      system: "power",
      tier: "base",
      name: "Base Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("base");
    expect(result).not.toContain("basic");
  });

  it('adds "advanced" tag for advanced talent', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "adv-talent",
      sphere: "alteration",
      system: "power",
      tier: "advanced",
      name: "Adv Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("advanced");
  });
});

// ─── Feat tags ──────────────────────────────────────────────────────────────

describe("buildOrderedTagIds — feats", () => {
  it('adds "feat" tag for feats', () => {
    const entry: AnyEntry = {
      type: "feat",
      id: "test-feat",
      sphere: "alteration",
      system: "power",
      name: "Test Feat",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("feat");
    expect(result).not.toContain("talent");
  });
});

// ─── Sphere tags ────────────────────────────────────────────────────────────

describe("buildOrderedTagIds — spheres", () => {
  it('adds "sphere" tag for spheres', () => {
    const entry: AnyEntry = {
      type: "sphere",
      id: "alteration",
      system: "power",
      name: "Alteration",
      icon: "alteration",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("sphere");
  });
});

// ─── 3PP detection ──────────────────────────────────────────────────────────

describe("buildOrderedTagIds — 3PP detection", () => {
  it('does not add "3pp" for Drop Dead Studios publisher', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "dds-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "DDS Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).not.toContain("3pp");
  });

  it('does not add "3pp" for Diamond Recreational Studios publisher', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "drs-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "DRS Talent",
      sourceBook: "diamond",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).not.toContain("3pp");
  });

  it('adds "3pp" for third-party publisher', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "3pp-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "3PP Talent",
      sourceBook: "third-party-book",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("3pp");
  });

  it('does not add "3pp" when publisher is missing from bookMetaMap (pub is undefined, guard is falsy)', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "orphan-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Orphan Talent",
      sourceBook: "unknown-book",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).not.toContain("3pp");
  });
});

// ─── User tags ──────────────────────────────────────────────────────────────

describe("buildOrderedTagIds — user tags", () => {
  it("includes user-specified tags", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "tagged-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Tagged Talent",
      sourceBook: "drop-dead",
      tags: ["combat", "metamagic"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("combat");
    expect(result).toContain("metamagic");
  });

  it("lowercases user tags", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "mixed-case-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Mixed Case",
      sourceBook: "drop-dead",
      tags: ["Combat", "META"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("combat");
    expect(result).toContain("meta");
  });

  it("deduplicates user tags and auto-tags", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "dup-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Dup Talent",
      sourceBook: "drop-dead",
      tags: ["talent", "basic"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    // talent and basic should appear exactly once despite being in both auto + user
    expect(result.filter((t) => t === "talent")).toHaveLength(1);
    expect(result.filter((t) => t === "basic")).toHaveLength(1);
  });
});

// ─── Dual-sphere logic ──────────────────────────────────────────────────────

describe("buildOrderedTagIds — dual-sphere", () => {
  it("adds primary sphere tag when entry has dualSphere", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "dual-talent",
      sphere: "alteration",
      dualSphere: "death",
      system: "power",
      tier: "basic",
      name: "Dual Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("alteration-sphere");
    expect(result).toContain("death-sphere");
  });

  it("adds dual sphere tag for feats with dualSphere", () => {
    const entry: AnyEntry = {
      type: "feat",
      id: "dual-feat",
      sphere: "alteration",
      dualSphere: "death",
      system: "power",
      name: "Dual Feat",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("death-sphere");
  });

  it("does not add sphere tag when includeSphere is not set and no dualSphere", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "plain-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Plain Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).not.toContain("alteration-sphere");
  });

  it("adds sphere tag when includeSphere option is true", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "included-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Included",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap, {
      includeSphere: true,
    });
    expect(result).toContain("alteration-sphere");
  });

  it('adds sphere tag when user tags contain a "-sphere" tag', () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "multi-sphere-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Multi Sphere",
      sourceBook: "drop-dead",
      tags: ["death-sphere"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("alteration-sphere");
    expect(result).toContain("death-sphere");
  });
});

// ─── Priority sorting ──────────────────────────────────────────────────────

describe("buildOrderedTagIds — priority sorting", () => {
  it("sorts tags by priority then alphabetically", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "sorted-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Sorted",
      sourceBook: "drop-dead",
      tags: ["utility", "combat"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);

    // Without dualSphere or includeSphere, no sphere tag is added.
    // Auto tags: talent (-10), basic (-9). User tags: combat (5), utility (10).
    const indices: Record<string, number> = {};
    result.forEach((t, i) => {
      indices[t] = i;
    });

    expect(indices["talent"]).toBeLessThan(indices["basic"]);
    expect(indices["basic"]).toBeLessThan(indices["combat"]);
    expect(indices["combat"]).toBeLessThan(indices["utility"]);
    expect(result).toHaveLength(4);
  });

  it("tags not in tagMap get priority 999 and sort alphabetically", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "unknown-tag-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Unknown",
      sourceBook: "drop-dead",
      tags: ["zzz-unknown", "aaa-unknown"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    const order = result.filter((t) => t.includes("unknown"));
    expect(order).toEqual(["aaa-unknown", "zzz-unknown"]);
  });

  it("unmapped user tags sort after all builtin tags", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "sort-test",
      sphere: "alteration",
      system: "power",
      tier: "advanced",
      name: "Sort Test",
      sourceBook: "drop-dead",
      tags: ["zzz-custom"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    const zzzIdx = result.indexOf("zzz-custom");
    const advIdx = result.indexOf("advanced");
    expect(zzzIdx).toBeGreaterThan(advIdx);
  });
});

// ─── getSystemAutoTags (extracted helper) ─────────────────────────────────

describe("getSystemAutoTags", () => {
  it("returns entry-type and tier tags for a basic talent", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "test-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Test Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = getSystemAutoTags(entry, bookMetaMap);
    expect(result.has("talent")).toBe(true);
    expect(result.has("basic")).toBe(true);
    expect(result.has("feat")).toBe(false);
  });

  it("flags 3pp for third-party sourceBook", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "3pp-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "3PP Talent",
      sourceBook: "third-party-book",
      tags: [],
    };
    const result = getSystemAutoTags(entry, bookMetaMap);
    expect(result.has("3pp")).toBe(true);
  });

  it("does not add sphere identity tag without dualSphere or includeSphere", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "plain-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Plain Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = getSystemAutoTags(entry, bookMetaMap);
    expect(result.has("alteration-sphere")).toBe(false);
  });

  it("adds primary + dual sphere identity tags when dualSphere is set", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "dual-talent",
      sphere: "alteration",
      dualSphere: "death",
      system: "power",
      tier: "basic",
      name: "Dual Talent",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = getSystemAutoTags(entry, bookMetaMap);
    expect(result.has("alteration-sphere")).toBe(true);
    expect(result.has("death-sphere")).toBe(true);
    expect(result.has("dual-sphere")).toBe(true);
  });

  it("respects includeSphere option to force sphere identity tag", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "included-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Included",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = getSystemAutoTags(entry, bookMetaMap, {
      includeSphere: true,
    });
    expect(result.has("alteration-sphere")).toBe(true);
  });
});

// ─── sortTagsByPriority (extracted helper) ────────────────────────────────

describe("sortTagsByPriority", () => {
  it("sorts by tagMap priority ascending, then alphabetically", () => {
    const result = sortTagsByPriority(
      ["utility", "combat", "talent", "basic"],
      tagMap,
      [],
    );
    expect(result).toEqual(["talent", "basic", "combat", "utility"]);
  });

  it("gives unmapped tags priority 999 (sorts last)", () => {
    const result = sortTagsByPriority(
      ["zzz-unknown", "aaa-unknown", "talent"],
      tagMap,
      [],
    );
    expect(result).toEqual(["talent", "aaa-unknown", "zzz-unknown"]);
  });

  it("hides undefined sphere-suffixed tags by convention", () => {
    const result = sortTagsByPriority(["alteration-sphere", "talent"], tagMap, []);
    // alteration-sphere has a tagMap def (hidden not set -> visible)
    expect(result).toContain("alteration-sphere");
  });

  it("hides tags marked hidden:true in tagMap unless user-specified", () => {
    const hiddenTagMap = new Map<string, TagEntry>([
      ...tagMap,
      ["secret", { ...makeTag("secret", 1), hidden: true }],
    ]);
    const result = sortTagsByPriority(["secret", "talent"], hiddenTagMap, []);
    expect(result).not.toContain("secret");
  });

  it("keeps user-specified tags visible even when marked hidden", () => {
    const hiddenTagMap = new Map<string, TagEntry>([
      ...tagMap,
      ["secret", { ...makeTag("secret", 1), hidden: true }],
    ]);
    const result = sortTagsByPriority(
      ["secret", "talent"],
      hiddenTagMap,
      ["secret"],
    );
    expect(result).toContain("secret");
  });

  it("showHidden option bypasses all visibility filtering", () => {
    const result = sortTagsByPriority(["alteration-sphere"], new Map(), [], {
      showHidden: true,
    });
    expect(result).toContain("alteration-sphere");
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe("buildOrderedTagIds — edge cases", () => {
  it("handles entry without tags field gracefully", () => {
    const entry = {
      type: "article" as const,
      id: "no-tags",
      system: "power",
      name: "No Tags",
      sourceBook: "drop-dead",
    } as AnyEntry;
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array when no auto-tags and no user tags", () => {
    const entry: AnyEntry = {
      type: "article",
      id: "empty-tags",
      system: "power",
      name: "Empty",
      sourceBook: "drop-dead",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toEqual([]);
  });

  it("handles sphere entry with user tags", () => {
    const entry: AnyEntry = {
      type: "sphere",
      id: "tagged-sphere",
      system: "power",
      name: "Tagged Sphere",
      icon: "test",
      sourceBook: "drop-dead",
      tags: ["combat"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    expect(result).toContain("sphere");
    expect(result).toContain("combat");
  });

  it("handles talent edge: talent with sphere tag in user tags adds primary sphere tag too", () => {
    const entry: AnyEntry = {
      type: "talent",
      id: "auto-sphere-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Auto Sphere",
      sourceBook: "drop-dead",
      tags: ["combat-sphere"],
    };
    const result = buildOrderedTagIds(entry, bookMetaMap, tagMap);
    // combat-sphere triggers isMultiSphere → primary sphere tag injected
    expect(result).toContain("alteration-sphere");
    expect(result).toContain("combat-sphere");
  });

  it("handles entries whose sourceBook has no publisher (empty string pub is falsy, no 3pp)", () => {
    const noPubMeta = new Map<string, BookMeta>([
      ["no-pub", makeBookMeta({ slug: "no-pub", publisher: "" })],
    ]);
    const entry: AnyEntry = {
      type: "talent",
      id: "no-pub-talent",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "No Pub",
      sourceBook: "no-pub",
      tags: [],
    };
    const result = buildOrderedTagIds(entry, noPubMeta, tagMap);
    expect(result).not.toContain("3pp");
  });
});
