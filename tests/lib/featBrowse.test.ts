import { describe, expect, it } from "vitest";
import {
  bodyToSearchText,
  buildFeatBrowseRows,
  extractPrerequisites,
  featCategoryOptions,
  featSystemOptions,
  featTagOptions,
  stripMarkdownInline,
} from "../../src/lib/featBrowse";
import type {
  BookMeta,
  FeatEntry,
  SphereEntry,
  TagEntry,
} from "../../src/lib/types";

function feat(
  partial: Partial<FeatEntry> & Pick<FeatEntry, "id" | "name" | "system">,
): FeatEntry {
  return {
    type: "feat",
    sourceBook: "spheres-of-power-core",
    tags: [],
    ...partial,
  } as FeatEntry;
}

const tagMap = new Map<string, TagEntry>([
  [
    "counterspell",
    {
      type: "tag",
      id: "counterspell",
      label: "Counterspell",
      priority: 10,
      description: "",
      featCategory: true,
      system: "power",
      sourceBook: "__built-in__",
    },
  ],
  [
    "feat",
    {
      type: "tag",
      id: "feat",
      label: "Feat",
      priority: 1,
      description: "",
      sourceBook: "__built-in__",
    },
  ],
]);

const bookMetaMap = new Map<string, BookMeta>([
  [
    "spheres-of-power-core",
    {
      slug: "spheres-of-power-core",
      title: "Ultimate Spheres of Power",
      publisher: "DDS",
      publishedDate: "2017-01-01",
    },
  ],
]);

const sphereMap = new Map<string, SphereEntry>();

describe("stripMarkdownInline", () => {
  it("removes links, emphasis, and collapses whitespace", () => {
    expect(stripMarkdownInline("[Foo](/x)  and *bar* `baz`")).toBe(
      "Foo and bar baz",
    );
  });

  it("handles markdown links with parentheses in URLs", () => {
    expect(stripMarkdownInline("[Foo](/x_(test)) and bar")).toBe("Foo and bar");
  });
});

describe("extractPrerequisites", () => {
  it("pulls the plain-text prerequisites line", () => {
    expect(
      extractPrerequisites(
        "**Prerequisites:** Counterspell, BAB +6\n\nBenefit…",
      ),
    ).toBe("Counterspell, BAB +6");
  });
  it("pulls a multi-line prerequisites paragraph", () => {
    expect(
      extractPrerequisites(
        "**Prerequisites:** Counterspell,\nBAB +6,\n[Spellcraft](/skills/spellcraft/)\n**Benefit:** Do the thing.",
      ),
    ).toBe("Counterspell, BAB +6, Spellcraft");
  });
  it("returns empty string when absent", () => {
    expect(extractPrerequisites("Just a benefit line.")).toBe("");
    expect(extractPrerequisites(undefined)).toBe("");
  });
});

describe("bodyToSearchText", () => {
  it("flattens to lowercase plain text", () => {
    expect(bodyToSearchText("# Heading\n\nSome **Bold** Text")).toContain(
      "some bold text",
    );
    expect(bodyToSearchText(undefined)).toBe("");
  });
});

describe("buildFeatBrowseRows", () => {
  const featMap = new Map<string, FeatEntry>([
    [
      "feat:spheres-of-power-core:zeta",
      feat({
        id: "zeta",
        name: "Zeta Feat",
        system: "power",
        tags: ["counterspell"],
      }),
    ],
    [
      "feat:spheres-of-power-core:alpha",
      feat({
        id: "alpha",
        name: "Alpha Feat",
        system: "power",
        category: "counterspell",
      }),
    ],
    ["feat:pf1e:ghost", feat({ id: "ghost", name: "Ghost", system: "pf1e" })],
  ]);
  const collEntriesMap = new Map<string, { body?: string }>([
    [
      "feat:spheres-of-power-core:zeta",
      { body: "**Prerequisites:** Counterspell\n\nBenefit." },
    ],
  ]);
  const maps = { featMap, tagMap, bookMetaMap, sphereMap };

  it("excludes feats whose system is not a player-facing Spheres system", () => {
    const rows = buildFeatBrowseRows(maps, collEntriesMap);
    expect(rows.map((r) => r.id)).toEqual(["alpha", "zeta"]);
  });

  it("orders rows deterministically by name then id", () => {
    const rows = buildFeatBrowseRows(maps, collEntriesMap);
    expect(rows[0].name).toBe("Alpha Feat");
    expect(rows[1].name).toBe("Zeta Feat");
  });

  it("emits a canonical href via getFeatUrl for every row", () => {
    const rows = buildFeatBrowseRows(maps, collEntriesMap);
    for (const row of rows) {
      expect(row.href).toMatch(/\/power\/feats\/counterspell\//);
      expect(row.href).not.toMatch(/\.html/);
      expect(row.key).toBe(row.href);
    }
  });

  it("extracts prerequisites from the body and leaves blanks empty", () => {
    const rows = buildFeatBrowseRows(maps, collEntriesMap);
    const zeta = rows.find((r) => r.id === "zeta");
    const alpha = rows.find((r) => r.id === "alpha");
    if (!zeta || !alpha) throw new Error("Expected zeta and alpha rows");
    expect(zeta.prerequisites).toBe("Counterspell");
    expect(alpha.prerequisites).toBe("");
    expect(alpha.summary).toBe("");
  });

  it("resolves source book title and css key", () => {
    const rows = buildFeatBrowseRows(maps, collEntriesMap);
    expect(rows[0].sourceBookTitle).toBe("Ultimate Spheres of Power");
    expect(rows[0].cssKey).toBe("power");
  });
});

describe("option builders", () => {
  const rows = buildFeatBrowseRows(
    {
      featMap: new Map([
        [
          "feat:spheres-of-power-core:a",
          feat({ id: "a", name: "A", system: "power", tags: ["counterspell"] }),
        ],
      ]),
      tagMap,
      bookMetaMap,
      sphereMap,
    },
    new Map(),
  );

  it("builds system options in registry order", () => {
    expect(featSystemOptions(rows)).toEqual([
      { value: "power", text: "Spheres of Power" },
    ]);
  });

  it("builds category options with labels", () => {
    expect(featCategoryOptions(rows, tagMap)).toEqual([
      { value: "counterspell", text: "Counterspell" },
    ]);
  });

  it("builds tag options from carried tags", () => {
    const opts = featTagOptions(rows, tagMap);
    expect(opts.map((o) => o.value)).toContain("counterspell");
    expect(opts.map((o) => o.value)).toContain("feat");
  });
});
