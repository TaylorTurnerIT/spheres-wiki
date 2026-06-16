import { describe, expect, it } from "vitest";
import { buildSections } from "../../src/lib/categorize";
import type { FeatEntry, SphereEntry, TalentEntry } from "../../src/lib/types";

function makeSphere(overrides: Partial<SphereEntry> = {}): SphereEntry {
  return {
    type: "sphere",
    id: "test-sphere",
    system: "power",
    name: "Test Sphere",
    icon: "test",
    sourceBook: "core",
    tags: [],
    ...overrides,
  };
}

function makeTalent(
  id: string,
  tier: "basic" | "advanced",
  tags: string[] = [],
  overrides: Partial<TalentEntry> = {},
): TalentEntry {
  return {
    type: "talent",
    id,
    sphere: "test-sphere",
    system: "power",
    tier,
    name: id,
    sourceBook: "core",
    tags,
    ...overrides,
  };
}

function makeFeat(
  id: string,
  tags: string[] = [],
  overrides: Partial<FeatEntry> = {},
): FeatEntry {
  return {
    type: "feat",
    id,
    sphere: "test-sphere",
    system: "power",
    name: id,
    sourceBook: "core",
    tags,
    ...overrides,
  };
}

describe("buildSections", () => {
  it("no sectionDefinitions → single Other section with catch-all categories", () => {
    const sphere = makeSphere();
    const talents = [
      makeTalent("alpha", "basic"),
      makeTalent("beta", "advanced"),
    ];
    const feats = [makeFeat("gamma-feat")];
    const sections = buildSections(sphere, talents, feats);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("other");
    expect(sections[0].label).toBe("Other");
    expect(sections[0].categories).toHaveLength(3);
    expect(sections[0].categories[0].id).toBe("basic-talents");
    expect(sections[0].categories[1].id).toBe("advanced-talents");
    expect(sections[0].categories[2].id).toBe("general-feats");
  });

  it("no sectionDefinitions, no talents, no feats → no sections", () => {
    const sections = buildSections(makeSphere(), [], []);
    expect(sections).toHaveLength(0);
  });

  it("sectionDefinitions with categories → maps entries into categories", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Talents",
          categories: [
            { label: "Body Talents", tiers: ["basic"], tags: ["body"] },
            { label: "Other Talents", tiers: ["basic"] },
          ],
        },
      ],
    });
    const talents = [
      makeTalent("arm", "basic", ["body"]),
      makeTalent("leg", "basic", ["body"]),
      makeTalent("zap", "basic"),
    ];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(1);
    const sec = sections[0];
    expect(sec.label).toBe("Talents");
    expect(sec.id).toBe("talents");
    expect(sec.categories).toHaveLength(2);

    const body = sec.categories[0];
    expect(body.label).toBe("Body Talents");
    expect(body.entries.map((e) => e.id)).toEqual(["arm", "leg"]);

    const other = sec.categories[1];
    expect(other.entries.map((e) => e.id)).toEqual(["zap"]);
  });

  it("section with no categories field → section with empty categories array", () => {
    const sphere = makeSphere({
      sectionDefinitions: [{ label: "Archetypes" }],
    });
    const sections = buildSections(sphere, [], []);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe("Archetypes");
    expect(sections[0].categories).toEqual([]);
  });

  it("empty category → included with empty entries array", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Talents",
          categories: [
            { label: "Body Talents", tiers: ["basic"], tags: ["body"] },
          ],
        },
      ],
    });
    const sections = buildSections(sphere, [makeTalent("zap", "basic")], []);
    expect(sections[0].categories[0].entries).toHaveLength(0);
  });

  it("unmatched entries land in Other catch-all appended after defined sections", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Talents",
          categories: [
            { label: "Body Talents", tiers: ["basic"], tags: ["body"] },
          ],
        },
      ],
    });
    const talents = [
      makeTalent("arm", "basic", ["body"]),
      makeTalent("zap", "basic"),
    ];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(2);
    const other = sections[1];
    expect(other.id).toBe("other");
    expect(other.categories[0].entries.map((e) => e.id)).toEqual(["zap"]);
  });

  it("entries sorted by id within each category", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Talents",
          categories: [{ label: "All", tiers: ["basic"] }],
        },
      ],
    });
    const talents = [
      makeTalent("zeta", "basic"),
      makeTalent("alpha", "basic"),
      makeTalent("mid", "basic"),
    ];
    const sections = buildSections(sphere, talents, []);
    expect(sections[0].categories[0].entries.map((e) => e.id)).toEqual([
      "alpha",
      "mid",
      "zeta",
    ]);
  });

  it("each entry claimed by first matching category only", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Talents",
          categories: [
            { label: "Body", tiers: ["basic"], tags: ["body"] },
            { label: "All Basic", tiers: ["basic"] },
          ],
        },
      ],
    });
    const talents = [makeTalent("arm", "basic", ["body"])];
    const sections = buildSections(sphere, talents, []);
    const cats = sections[0].categories;
    expect(cats[0].entries).toHaveLength(1);
    expect(cats[1].entries).toHaveLength(0);
  });

  it("entry matched in one section cannot appear in a later section", () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: "Section A",
          categories: [{ label: "All Basic", tiers: ["basic"] }],
        },
        {
          label: "Section B",
          categories: [{ label: "All Basic Again", tiers: ["basic"] }],
        },
      ],
    });
    const talents = [makeTalent("shared", "basic")];
    const sections = buildSections(sphere, talents, []);

    expect(sections[0].categories[0].entries.map((e) => e.id)).toEqual([
      "shared",
    ]);
    expect(sections[1].categories[0].entries).toHaveLength(0);
  });

  describe("dual-sphere tags (auto-injected from dualSphere field)", () => {
    it('dual-sphere feat matches tags: ["dual-sphere"] category', () => {
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Feats",
            categories: [
              {
                label: "Sphere Feats",
                tiers: ["feat"],
                excludeTags: ["dual-sphere"],
              },
              {
                label: "Dual Sphere Feats",
                tiers: ["feat"],
                tags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const feats = [
        makeFeat("alpha", [], { dualSphere: "other-sphere" }),
        makeFeat("beta", []),
      ];
      const sections = buildSections(sphere, [], feats);

      const cats = sections[0].categories;
      // alpha has dualSphere → effective tags include "dual-sphere" → routed to Dual Sphere Feats
      expect(cats[0].entries.map((e) => e.id)).toEqual(["beta"]);
      expect(cats[1].entries.map((e) => e.id)).toEqual(["alpha"]);
    });

    it('dual-sphere feat is excluded from excludeTags: ["dual-sphere"] category', () => {
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Feats",
            categories: [
              {
                label: "Sphere Feats",
                tiers: ["feat"],
                excludeTags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const feats = [
        makeFeat("normal"),
        makeFeat("dual", [], { dualSphere: "other-sphere" }),
      ];
      const sections = buildSections(sphere, [], feats);

      // Only the non-dual-sphere feat should appear in Sphere Feats
      expect(sections[0].categories[0].entries.map((e) => e.id)).toEqual([
        "normal",
      ]);
      // The dual-sphere feat falls into the Other catch-all
      expect(sections[1].categories[0].entries.map((e) => e.id)).toEqual([
        "dual",
      ]);
    });

    it('dualSphere: "any" DOES inject the dual-sphere tag (universal pairing)', () => {
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Feats",
            categories: [
              {
                label: "Sphere Feats",
                tiers: ["feat"],
                excludeTags: ["dual-sphere"],
              },
              {
                label: "Dual Sphere Feats",
                tiers: ["feat"],
                tags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const feats = [makeFeat("universal", [], { dualSphere: "any" })];
      const sections = buildSections(sphere, [], feats);

      const cats = sections[0].categories;
      // dualSphere:"any" means pairs with all spheres — still a dual-sphere feat.
      // It should be excluded from Sphere Feats (has dual-sphere tag) and routed
      // to Dual Sphere Feats.
      expect(cats[0].entries).toHaveLength(0);
      expect(cats[1].entries.map((e) => e.id)).toEqual(["universal"]);
    });

    it("dual-sphere talent also gets effective tags", () => {
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Talents",
            categories: [
              {
                label: "Sphere Talents",
                tiers: ["advanced"],
                excludeTags: ["dual-sphere"],
              },
              {
                label: "Dual Sphere Talents",
                tiers: ["advanced"],
                tags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const talents = [
        makeTalent("cross-talent", "advanced", [], {
          dualSphere: "other-sphere",
        }),
        makeTalent("normal-talent", "advanced"),
      ];
      const sections = buildSections(sphere, talents, []);

      const cats = sections[0].categories;
      expect(cats[0].entries.map((e) => e.id)).toEqual(["normal-talent"]);
      expect(cats[1].entries.map((e) => e.id)).toEqual(["cross-talent"]);
    });

    it("dual-sphere feat with additional raw tags still works", () => {
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Feats",
            categories: [
              {
                label: "Sphere Feats",
                tiers: ["feat"],
                excludeTags: ["dual-sphere"],
              },
              {
                label: "Dual Sphere Feats",
                tiers: ["feat"],
                tags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const feats = [
        // Has both a raw tag AND dualSphere → effective tags = ["drawback", "dual-sphere"]
        makeFeat("special-dual", ["drawback"], { dualSphere: "other-sphere" }),
      ];
      const sections = buildSections(sphere, [], feats);

      const cats = sections[0].categories;
      // Should be excluded from Sphere Feats (has dual-sphere) and routed to Dual Sphere Feats
      expect(cats[0].entries).toHaveLength(0);
      expect(cats[1].entries.map((e) => e.id)).toEqual(["special-dual"]);
    });

    it("mix of dual-sphere and non-dual-sphere feats with real-world pattern", () => {
      // Simulates the actual Light sphere sectionDefinitions pattern
      const sphere = makeSphere({
        sectionDefinitions: [
          {
            label: "Feats",
            categories: [
              {
                label: "Light Feats",
                tiers: ["feat"],
                excludeTags: ["combat", "dual-sphere"],
              },
              { label: "Combat Feats", tiers: ["feat"], tags: ["combat"] },
              {
                label: "Dual Sphere Feats",
                tiers: ["feat"],
                tags: ["dual-sphere"],
              },
            ],
          },
        ],
      });
      const feats = [
        makeFeat("afterglow"), // plain Light feat
        makeFeat("night-sky", [], { dualSphere: "dark" }), // Light+Dark dual-sphere
        makeFeat("light-armor", ["combat"]), // combat Light feat
        makeFeat("bioluminescent-transformation", [], {
          dualSphere: "alteration",
        }), // dual-sphere
      ];
      const sections = buildSections(sphere, [], feats);

      const cats = sections[0].categories;
      expect(cats[0].label).toBe("Light Feats");
      expect(cats[0].entries.map((e) => e.id)).toEqual(["afterglow"]);

      expect(cats[1].label).toBe("Combat Feats");
      expect(cats[1].entries.map((e) => e.id)).toEqual(["light-armor"]);

      expect(cats[2].label).toBe("Dual Sphere Feats");
      expect(cats[2].entries.map((e) => e.id)).toEqual([
        "bioluminescent-transformation",
        "night-sky",
      ]);
    });
  });
});
