import { describe, expect, it } from "vitest";
import {
  buildFeatBrowseRow,
  buildFeatBrowseRows,
  deriveFeatSummary,
  getFeatCategoryLabel,
  stripMarkdownInline,
} from "../../src/lib/featBrowse";
import type { BookMeta, FeatEntry, SphereEntry, TagEntry } from "../../src/lib/types";

describe("stripMarkdownInline", () => {
  it("strips bold, italic, links, code, and headings", () => {
    expect(stripMarkdownInline("**Benefit:** You gain a *bonus*.")).toBe(
      "Benefit: You gain a bonus.",
    );
    expect(stripMarkdownInline("[Alteration Sphere](power/alteration/)")).toBe(
      "Alteration Sphere",
    );
    expect(stripMarkdownInline("`talent`")).toBe("talent");
    expect(stripMarkdownInline("# Heading\ntext")).toBe("Heading text");
  });

  it("collapses whitespace across lines", () => {
    expect(stripMarkdownInline("line one\n\nline two")).toBe("line one line two");
  });
});

describe("deriveFeatSummary", () => {
  it("extracts a Prerequisites line and a cleaned excerpt", () => {
    const body = [
      "**Prerequisites:** Critical Focus, Base Attack Bonus +10",
      "",
      "**Benefits:** When you confirm a critical hit against a spellcaster, you sever their magic.",
    ].join("\n");
    const { prerequisites, excerpt } = deriveFeatSummary(body);
    expect(prerequisites).toBe("Critical Focus, Base Attack Bonus +10");
    expect(excerpt).toContain("When you confirm a critical hit");
    expect(excerpt).not.toMatch(/^Benefit/i);
  });

  it("handles a body with no Prerequisites line", () => {
    const body = "**Benefit:** When you use a sphere ability, you may share it.";
    const { prerequisites, excerpt } = deriveFeatSummary(body);
    expect(prerequisites).toBe("");
    expect(excerpt).toBe("When you use a sphere ability, you may share it.");
  });

  it("handles singular Prerequisite label", () => {
    const body = "**Prerequisite:** Basic Magic Training.\n\n**Benefit:** Text here.";
    const { prerequisites } = deriveFeatSummary(body);
    expect(prerequisites).toBe("Basic Magic Training.");
  });

  it("returns empty strings for an undefined body", () => {
    expect(deriveFeatSummary(undefined)).toEqual({ prerequisites: "", excerpt: "" });
  });

  it("truncates a long excerpt at a word boundary with an ellipsis", () => {
    const longSentence = "word ".repeat(60).trim();
    const { excerpt } = deriveFeatSummary(`**Benefit:** ${longSentence}`);
    expect(excerpt.length).toBeLessThanOrEqual(161);
    expect(excerpt.endsWith("…")).toBe(true);
  });
});

describe("getFeatCategoryLabel", () => {
  const tagMap = new Map<string, TagEntry>([
    [
      "combat",
      {
        type: "tag",
        id: "combat",
        label: "Combat",
        priority: 1,
        description: "",
        sourceBook: "__built-in__",
        featCategory: true,
      },
    ],
  ]);
  const sphereMap = new Map<string, SphereEntry>([
    [
      "sphere:alteration",
      { type: "sphere", id: "alteration", name: "Alteration", system: "power" } as SphereEntry,
    ],
  ]);

  it("prefers a feat-category tag label", () => {
    expect(getFeatCategoryLabel("combat", tagMap, sphereMap)).toBe("Combat");
  });

  it("falls back to a sphere name", () => {
    expect(getFeatCategoryLabel("alteration", tagMap, sphereMap)).toBe("Alteration");
  });

  it("title-cases an unknown category as a last resort", () => {
    expect(getFeatCategoryLabel("general", tagMap, sphereMap)).toBe("General");
  });
});

describe("buildFeatBrowseRow / buildFeatBrowseRows", () => {
  const tagMap = new Map<string, TagEntry>([
    [
      "combat",
      {
        type: "tag",
        id: "combat",
        label: "Combat",
        priority: 1,
        description: "",
        sourceBook: "__built-in__",
        featCategory: true,
      },
    ],
  ]);
  const sphereMap = new Map<string, SphereEntry>();
  const bookMetaMap = new Map<string, BookMeta>([
    [
      "ultimate-spheres-of-power",
      { slug: "ultimate-spheres-of-power", title: "Ultimate Spheres of Power" } as BookMeta,
    ],
  ]);

  const feat: FeatEntry = {
    type: "feat",
    id: "severing-critical",
    system: "power",
    name: "Severing Critical",
    sourceBook: "ultimate-spheres-of-power",
    tags: ["combat"],
  };

  it("builds a row with derived excerpt, prerequisites, and canonical href", () => {
    const row = buildFeatBrowseRow(feat, {
      tagMap,
      bookMetaMap,
      sphereMap,
      body: "**Prerequisites:** Critical Focus\n\n**Benefit:** Sever their magic.",
    });
    expect(row.id).toBe("severing-critical");
    expect(row.system).toBe("power");
    expect(row.category).toBe("combat");
    expect(row.categoryLabel).toBe("Combat");
    expect(row.sourceBookTitle).toBe("Ultimate Spheres of Power");
    expect(row.prerequisites).toBe("Critical Focus");
    expect(row.excerpt).toBe("Sever their magic.");
    expect(row.href).toBe("/power/feats/combat/severing-critical/");
    expect(row.tagIds).toContain("combat");
  });

  it("produces exactly one row per feat, sorted by name then id", () => {
    const featB: FeatEntry = { ...feat, id: "aardvark-strike", name: "Aardvark Strike" };
    const rows = buildFeatBrowseRows([feat, featB], {
      tagMap,
      bookMetaMap,
      sphereMap,
      bodies: new Map(),
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["aardvark-strike", "severing-critical"]);
  });
});
