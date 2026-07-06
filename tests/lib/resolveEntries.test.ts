import { describe, expect, it } from "vitest";
import { buildResolvedMaps, buildTagMap } from "../../src/lib/resolveEntries";
import type {
  AnyEntry,
  BoonEntry,
  ClassFeatureEntry,
  ClassTraitEntry,
  DrawbackEntry,
  TraditionEntry,
} from "../../src/lib/types";

type BookInput = { slug: string; publishedDate: string; entries: AnyEntry[] };

const baseBook: BookInput = {
  slug: "spheres-of-power-core",
  publishedDate: "2017-01-01",
  entries: [
    {
      type: "sphere",
      id: "alteration",
      system: "power",
      name: "Alteration",
      icon: "alteration",
      sourceBook: "spheres-of-power-core",
      tags: [],
    },
    {
      type: "talent",
      id: "alter-shape",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Alter Shape",
      sourceBook: "spheres-of-power-core",
      tags: [],
    },
    {
      type: "class",
      id: "shifter",
      system: "power",
      name: "Shifter",
      sourceBook: "spheres-of-power-core",
      tags: [],
      hitDie: 8,
      alignment: "Any non-lawful",
      startingWealth: "3d6 × 10 gp",
      skillRanks: 4,
      classSkills: ["Acrobatics", "Bluff"],
      babProgression: "3/4",
      fortSaveProgression: "good",
      refSaveProgression: "good",
      willSaveProgression: "poor",
    },
  ],
};

const errataBook: BookInput = {
  slug: "errata-2024-01",
  publishedDate: "2024-01-15",
  entries: [
    {
      type: "talent",
      id: "alter-shape",
      sphere: "alteration",
      system: "power",
      tier: "basic",
      name: "Alter Shape (Corrected)",
      sourceBook: "errata-2024-01",
      tags: [],
      modifies: "alter-shape",
    },
  ],
};

describe("buildResolvedMaps", () => {
  it('adds sphere entries under "sphere:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.sphereMap.has("sphere:alteration")).toBe(true);
    expect(maps.sphereMap.get("sphere:alteration")?.name).toBe("Alteration");
  });

  it('adds talent entries under "talent:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.talentMap.has("talent:alter-shape")).toBe(true);
    expect(maps.talentMap.get("talent:alter-shape")?.name).toBe("Alter Shape");
  });

  it('adds class entries under "class:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.classMap.has("class:shifter")).toBe(true);
    expect(maps.classMap.get("class:shifter")?.name).toBe("Shifter");
  });

  it("records the source book for each entry", () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.entrySourceBook.get("talent:alter-shape")).toBe(
      "spheres-of-power-core",
    );
  });

  it("applies errata patch: later book replaces name", () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.talentMap.get("talent:alter-shape")?.name).toBe(
      "Alter Shape (Corrected)",
    );
  });

  it("errata does not change the source book attribution", () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.entrySourceBook.get("talent:alter-shape")).toBe(
      "spheres-of-power-core",
    );
  });

  it("errata applied in publishedDate order regardless of array order", () => {
    const maps = buildResolvedMaps([errataBook, baseBook]);
    expect(maps.talentMap.get("talent:alter-shape")?.name).toBe(
      "Alter Shape (Corrected)",
    );
  });

  it("errata patch does not leak modifies field onto resolved entry", () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    const resolved = maps.talentMap.get("talent:alter-shape");
    expect(resolved).toBeDefined();
    expect(
      (resolved as Record<string, unknown> | undefined)?.modifies,
    ).toBeUndefined();
    expect(resolved?.id).toBe("alter-shape");
  });

  it("silently skips errata patch when base entry does not exist", () => {
    const orphanErrata: BookInput = {
      slug: "orphan-errata",
      publishedDate: "2024-06-01",
      entries: [
        {
          type: "talent",
          id: "nonexistent",
          sphere: "alteration",
          system: "power",
          tier: "basic",
          name: "Ghost Talent",
          sourceBook: "orphan-errata",
          tags: [],
          modifies: "nonexistent",
        },
      ],
    };
    expect(() => buildResolvedMaps([orphanErrata])).not.toThrow();
    const maps = buildResolvedMaps([orphanErrata]);
    expect(maps.talentMap.size).toBe(0);
  });

  it("does not cross-contaminate types: talent:alter-shape != sphere:alter-shape", () => {
    const bookWithCollision: BookInput = {
      ...baseBook,
      entries: [
        ...baseBook.entries,
        {
          type: "sphere",
          id: "alter-shape",
          system: "power",
          name: "Should Not Patch",
          icon: "alteration",
          sourceBook: "spheres-of-power-core",
          tags: [],
        },
      ],
    };
    const maps = buildResolvedMaps([bookWithCollision]);
    expect(maps.talentMap.get("talent:alter-shape")?.name).toBe("Alter Shape");
    expect(maps.sphereMap.get("sphere:alter-shape")?.name).toBe(
      "Should Not Patch",
    );
  });
});

describe("classFeatureMap and classTraitMap", () => {
  const featureEntry: ClassFeatureEntry = {
    type: "class-feature",
    id: "shifter-bestial-trait",
    system: "power",
    name: "Bestial Trait",
    sourceBook: "spheres-of-power-core",
    tags: [],
    className: "shifter",
    level: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  };

  const traitEntry: ClassTraitEntry = {
    type: "class-trait",
    id: "shifter-adaptation",
    system: "power",
    name: "Adaptation (Ex)",
    sourceBook: "spheres-of-power-core",
    tags: [],
    className: "shifter",
    featureId: "shifter-bestial-trait",
  };

  const bookWithFeatures: BookInput = {
    slug: "spheres-of-power-core",
    publishedDate: "2017-01-01",
    entries: [...baseBook.entries, featureEntry, traitEntry],
  };

  it('adds class-feature entries under "class-feature:id" key', () => {
    const maps = buildResolvedMaps([bookWithFeatures]);
    expect(
      maps.classFeatureMap.has("class-feature:shifter-bestial-trait"),
    ).toBe(true);
    expect(
      maps.classFeatureMap.get("class-feature:shifter-bestial-trait")
        ?.className,
    ).toBe("shifter");
  });

  it("stores level as array when provided as array", () => {
    const maps = buildResolvedMaps([bookWithFeatures]);
    const feature = maps.classFeatureMap.get(
      "class-feature:shifter-bestial-trait",
    );
    const level = feature?.level;
    expect(Array.isArray(level)).toBe(true);
    expect((level as number[])[0]).toBe(2);
  });

  it('adds class-trait entries under "class-trait:id" key', () => {
    const maps = buildResolvedMaps([bookWithFeatures]);
    expect(maps.classTraitMap.has("class-trait:shifter-adaptation")).toBe(true);
    expect(
      maps.classTraitMap.get("class-trait:shifter-adaptation")?.featureId,
    ).toBe("shifter-bestial-trait");
  });

  it("class-feature and class-trait recorded in entrySourceBook", () => {
    const maps = buildResolvedMaps([bookWithFeatures]);
    expect(
      maps.entrySourceBook.get("class-feature:shifter-bestial-trait"),
    ).toBe("spheres-of-power-core");
    expect(maps.entrySourceBook.get("class-trait:shifter-adaptation")).toBe(
      "spheres-of-power-core",
    );
  });
});

describe("buildTagMap", () => {
  it("stores a tag by its id", () => {
    const result = buildTagMap([
      {
        slug: "spheres-of-power-core",
        rawTagEntries: [
          {
            id: "combat",
            label: "Combat",
            priority: 1,
            description: "Combat stuff.",
          },
        ],
      },
    ]);
    expect(result.has("combat")).toBe(true);
    expect(result.get("combat")?.label).toBe("Combat");
    expect(result.get("combat")?.priority).toBe(1);
  });

  it("injects sourceBook from book slug, overriding any value in the raw entry", () => {
    const result = buildTagMap([
      {
        slug: "spheres-of-power-core",
        rawTagEntries: [
          {
            id: "combat",
            label: "Combat",
            priority: 1,
            description: "Combat.",
          },
        ],
      },
    ]);
    expect(result.get("combat")?.sourceBook).toBe("spheres-of-power-core");
  });

  it('sets type to "tag" on the stored entry', () => {
    const result = buildTagMap([
      {
        slug: "book-a",
        rawTagEntries: [
          {
            id: "utility",
            label: "Utility",
            priority: 5,
            description: "Utility.",
          },
        ],
      },
    ]);
    expect(result.get("utility")?.type).toBe("tag");
  });

  it("throws on duplicate tag id across books", () => {
    expect(() =>
      buildTagMap([
        {
          slug: "book-a",
          rawTagEntries: [
            { id: "combat", label: "Combat", priority: 1, description: "A." },
          ],
        },
        {
          slug: "book-b",
          rawTagEntries: [
            { id: "combat", label: "Combat", priority: 1, description: "B." },
          ],
        },
      ]),
    ).toThrow('Duplicate tag "combat"');
  });

  it("error message names both books", () => {
    expect(() =>
      buildTagMap([
        {
          slug: "book-a",
          rawTagEntries: [
            { id: "x", label: "X", priority: 1, description: "X." },
          ],
        },
        {
          slug: "book-b",
          rawTagEntries: [
            { id: "x", label: "X", priority: 1, description: "X." },
          ],
        },
      ]),
    ).toThrow(/book-a.*book-b|book-b.*book-a/);
  });

  it("returns empty map when no tag entries", () => {
    const result = buildTagMap([{ slug: "book-a", rawTagEntries: [] }]);
    expect(result.size).toBe(0);
  });

  it("collects tags from multiple books without conflict", () => {
    const result = buildTagMap([
      {
        slug: "book-a",
        rawTagEntries: [
          { id: "combat", label: "Combat", priority: 1, description: "A." },
        ],
      },
      {
        slug: "book-b",
        rawTagEntries: [
          { id: "utility", label: "Utility", priority: 5, description: "B." },
        ],
      },
    ]);
    expect(result.size).toBe(2);
    expect(result.get("utility")?.sourceBook).toBe("book-b");
  });

  it("throws with clear message on duplicate tag id within the same book", () => {
    expect(() =>
      buildTagMap([
        {
          slug: "book-a",
          rawTagEntries: [
            { id: "combat", label: "Combat", priority: 1, description: "A." },
            {
              id: "combat",
              label: "Combat Alt",
              priority: 2,
              description: "B.",
            },
          ],
        },
      ]),
    ).toThrow(/defined twice in "book-a"/);
  });
});

describe("archetypeMap and archetypeFeatureMap", () => {
  const archetypeEntry = {
    type: "archetype",
    id: "apex-shifter",
    system: "power",
    name: "Apex Shifter",
    sourceBook: "spheres-of-power-core",
    tags: [],
    className: "shifter",
  } as any;

  const featureEntry = {
    type: "archetype-feature",
    id: "apex-shifter-knowledge",
    system: "power",
    name: "Knowledge of Many Shapes",
    sourceBook: "spheres-of-power-core",
    tags: [],
    archetypeId: "apex-shifter",
    level: 3,
    replaces: ["shifter-endurance"],
    mutuallyExclusive: true,
  } as any;

  const bookWithArchetypes = {
    slug: "spheres-of-power-core",
    publishedDate: "2017-01-01",
    entries: [archetypeEntry, featureEntry],
  };

  it('adds archetype entries under "archetype:id" key', () => {
    const maps = buildResolvedMaps([bookWithArchetypes]);
    expect(maps.archetypeMap.has("archetype:apex-shifter")).toBe(true);
    expect(maps.archetypeMap.get("archetype:apex-shifter")?.className).toBe(
      "shifter",
    );
  });

  it('adds archetype-feature entries under "archetype-feature:id" key', () => {
    const maps = buildResolvedMaps([bookWithArchetypes]);
    expect(
      maps.archetypeFeatureMap.has("archetype-feature:apex-shifter-knowledge"),
    ).toBe(true);
    expect(
      maps.archetypeFeatureMap.get("archetype-feature:apex-shifter-knowledge")
        ?.replaces,
    ).toContain("shifter-endurance");
  });
});

describe("casting tradition maps", () => {
  const drainingCasting: DrawbackEntry = {
    type: "drawback",
    id: "draining-casting",
    system: "power",
    name: "Draining Casting",
    sourceBook: "ultimate-spheres-of-power",
    tags: [],
    drawbackKind: "general",
    drawbackValue: 1,
  };

  const lycanthropic: DrawbackEntry = {
    type: "drawback",
    id: "lycanthropic",
    system: "power",
    name: "Lycanthropic",
    sourceBook: "ultimate-spheres-of-power",
    tags: [],
    drawbackKind: "sphere",
    drawbackValue: 1,
    sphere: "alteration",
    incompatible: ["fleshwarper", "rebound"],
  };

  const fortifiedCasting: BoonEntry = {
    type: "boon",
    id: "fortified-casting",
    system: "power",
    name: "Fortified Casting",
    sourceBook: "ultimate-spheres-of-power",
    tags: [],
    boonCost: 1,
    requires: { all: [{ drawback: "draining-casting" }] },
    rules: [
      {
        op: "allow-cam",
        ability: "con",
        mode: "if-higher-than-base",
      },
    ],
  };

  const bloodMagic: TraditionEntry = {
    type: "tradition",
    id: "blood-magic",
    system: "power",
    name: "Blood Magic",
    sourceBook: "ultimate-spheres-of-power",
    tags: [],
    traditionKind: "custom",
    magicType: "arcane",
    cam: { mode: "fixed", abilities: ["con"] },
    drawbacks: [
      { id: "draining-casting" },
      { id: "extended-casting" },
      { id: "somatic-casting", count: 2 },
      { id: "verbal-casting" },
    ],
    boons: [
      { id: "deathful-magic" },
      { id: "fortified-casting" },
      { id: "overcharge" },
    ],
  };

  const bookWithTraditions: BookInput = {
    slug: "ultimate-spheres-of-power",
    publishedDate: "2017-01-01",
    entries: [drainingCasting, lycanthropic, fortifiedCasting, bloodMagic],
  };

  it('adds drawback entries under "drawback:id" key', () => {
    const maps = buildResolvedMaps([bookWithTraditions]);
    expect(maps.drawbackMap.has("drawback:draining-casting")).toBe(true);
    expect(maps.drawbackMap.get("drawback:lycanthropic")?.sphere).toBe(
      "alteration",
    );
  });

  it('adds boon entries under "boon:id" key', () => {
    const maps = buildResolvedMaps([bookWithTraditions]);
    expect(maps.boonMap.has("boon:fortified-casting")).toBe(true);
    expect(maps.boonMap.get("boon:fortified-casting")?.rules?.[0]).toEqual({
      op: "allow-cam",
      ability: "con",
      mode: "if-higher-than-base",
    });
  });

  it('adds tradition entries under "tradition:id" key', () => {
    const maps = buildResolvedMaps([bookWithTraditions]);
    expect(maps.traditionMap.has("tradition:blood-magic")).toBe(true);
    expect(maps.traditionMap.get("tradition:blood-magic")?.cam).toEqual({
      mode: "fixed",
      abilities: ["con"],
    });
  });

  it("records casting tradition entries in entrySourceBook", () => {
    const maps = buildResolvedMaps([bookWithTraditions]);
    expect(maps.entrySourceBook.get("drawback:draining-casting")).toBe(
      "ultimate-spheres-of-power",
    );
    expect(maps.entrySourceBook.get("boon:fortified-casting")).toBe(
      "ultimate-spheres-of-power",
    );
    expect(maps.entrySourceBook.get("tradition:blood-magic")).toBe(
      "ultimate-spheres-of-power",
    );
  });
});

describe("buildTagMap — negative priorities", () => {
  it("accepts tags with negative priority values", () => {
    const map = buildTagMap([
      {
        slug: "__built-in__",
        rawTagEntries: [
          {
            id: "talent",
            label: "Talent",
            priority: -10,
            description: "A magical ability.",
          },
        ],
      },
    ]);
    expect(map.get("talent")?.priority).toBe(-10);
  });
});
