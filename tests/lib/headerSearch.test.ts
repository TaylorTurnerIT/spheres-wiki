// tests/lib/headerSearch.test.ts
import { describe, expect, it } from "vitest";
import {
  detectEntryType,
  formatSubtitle,
  groupSearchResults,
  type HeaderSearchItem,
  renderResultsPanel,
  scoreSearchItem,
} from "@/lib/headerSearchClient";

describe("Header Search Client", () => {
  it("detects entry types correctly from meta or URLs", () => {
    expect(detectEntryType("type:sphere", "/power/alteration/")).toBe("sphere");
    expect(
      detectEntryType(
        "type:talent",
        "/power/alteration/sustaining-shapeshift/",
      ),
    ).toBe("talent");
    expect(detectEntryType("type:feat", "/feats/combat/extra-trait/")).toBe(
      "feat",
    );
    expect(detectEntryType("type:class", "/power/classes/shifter/")).toBe(
      "class",
    );
    expect(
      detectEntryType(
        "type:class-trait",
        "/power/classes/shifter/traits/bestial-rage/",
      ),
    ).toBe("class-trait");
    expect(
      detectEntryType(undefined, "/power/classes/shifter/traits/trait-id/"),
    ).toBe("class-trait");
    expect(
      detectEntryType(undefined, "/power/classes/shifter/archetype-id/"),
    ).toBe("archetype");
    expect(detectEntryType(undefined, "/power/classes/shifter/")).toBe("class");
    expect(detectEntryType(undefined, "/power/alteration/")).toBe("sphere");
    expect(
      detectEntryType(undefined, "/power/alteration/sustaining-shapeshift/"),
    ).toBe("talent");
  });

  it("formats subtitles according to the design specification", () => {
    const alterationSphere: HeaderSearchItem = {
      url: "/power/alteration/",
      title: "Alteration",
      type: "sphere",
      system: "Spheres of Power",
      talentCount: 66,
    };
    expect(formatSubtitle(alterationSphere)).toBe("Magic sphere · 66 talents");

    const sustainingShapeshift: HeaderSearchItem = {
      url: "/power/alteration/sustaining-shapeshift/",
      title: "Sustaining Shapeshift",
      type: "talent",
      sphere: "Alteration",
      system: "Spheres of Power",
    };
    expect(formatSubtitle(sustainingShapeshift)).toBe("Alteration · talent");

    const extraTrait: HeaderSearchItem = {
      url: "/power/alteration/extra-trait/",
      title: "Extra Trait",
      type: "feat",
      sphere: "Alteration",
      system: "Spheres of Power",
    };
    expect(formatSubtitle(extraTrait)).toBe("Alteration · feat");

    const shifterClass: HeaderSearchItem = {
      url: "/power/classes/shifter/",
      title: "Shifter",
      type: "class",
      system: "Spheres of Power",
    };
    expect(formatSubtitle(shifterClass)).toBe("Class · Alteration specialist");
  });

  it("groups search results into categories with configured limits", () => {
    const items: HeaderSearchItem[] = [
      {
        url: "/power/alteration/",
        title: "Alteration",
        type: "sphere",
        system: "Spheres of Power",
      },
      {
        url: "/power/alteration/sustaining-shapeshift/",
        title: "Sustaining Shapeshift",
        type: "talent",
        sphere: "Alteration",
      },
      {
        url: "/power/alteration/alteration-mastery/",
        title: "Alteration Mastery",
        type: "talent",
        sphere: "Alteration",
      },
      {
        url: "/power/feats/extra-trait/",
        title: "Extra Trait",
        type: "feat",
        sphere: "Alteration",
      },
      {
        url: "/power/classes/shifter/",
        title: "Shifter",
        type: "class",
        system: "Spheres of Power",
      },
    ];

    const groups = groupSearchResults(items);
    expect(groups.get("sphere")?.length).toBe(1);
    expect(groups.get("talent")?.length).toBe(2);
    expect(groups.get("feat")?.length).toBe(1);
    expect(groups.get("class")?.length).toBe(1);
  });

  it("scores and ranks items with priority for spheres, title prefixes, and sphere associations", () => {
    const alterationSphere: HeaderSearchItem = {
      url: "/power/alteration/",
      title: "Alteration",
      type: "sphere",
    };
    const alterTalent: HeaderSearchItem = {
      url: "/power/creation/alter/",
      title: "Alter",
      type: "talent",
      sphere: "Creation",
    };
    const sustainingShapeshift: HeaderSearchItem = {
      url: "/power/alteration/sustaining-shapeshift/",
      title: "Sustaining Shapeshift",
      type: "talent",
      sphere: "Alteration",
    };
    const randomItem: HeaderSearchItem = {
      url: "/power/destruction/fire/",
      title: "Fire Blast",
      type: "talent",
    };

    expect(scoreSearchItem(alterationSphere, "alter")).toBeGreaterThan(
      scoreSearchItem(sustainingShapeshift, "alter"),
    );
    expect(scoreSearchItem(alterTalent, "alter")).toBeGreaterThan(
      scoreSearchItem(randomItem, "alter"),
    );
    expect(scoreSearchItem(randomItem, "alter")).toBe(0);

    const items: HeaderSearchItem[] = [
      randomItem,
      alterTalent,
      alterationSphere,
      sustainingShapeshift,
    ];
    const grouped = groupSearchResults(items, "alter");
    expect(grouped.get("sphere")?.[0].title).toBe("Alteration");
    expect(grouped.get("talent")?.[0].title).toBe("Alter");
  });

  it("renders the results panel HTML matching the design structure", () => {
    const items: HeaderSearchItem[] = [
      {
        url: "/power/alteration/",
        title: "Alteration",
        type: "sphere",
        system: "Spheres of Power",
        talentCount: 66,
        icon: "alteration",
      },
      {
        url: "/power/alteration/sustaining-shapeshift/",
        title: "Sustaining Shapeshift",
        type: "talent",
        sphere: "Alteration",
      },
      {
        url: "/power/feats/extra-trait/",
        title: "Extra Trait",
        type: "feat",
        sphere: "Alteration",
      },
      {
        url: "/power/classes/shifter/",
        title: "Shifter",
        type: "class",
        system: "Spheres of Power",
      },
    ];

    const groups = groupSearchResults(items);
    const { html, totalRendered } = renderResultsPanel(
      groups,
      { shifter: "/img/shifter.png" },
      "alter",
    );

    expect(totalRendered).toBe(4);
    expect(html).toContain("SPHERES");
    expect(html).toContain("TALENTS");
    expect(html).toContain("FEATS");
    expect(html).toContain("CLASSES");
    expect(html).toContain("Alteration");
    expect(html).toContain("Magic sphere · 66 talents");
    expect(html).toContain("Sustaining Shapeshift");
    expect(html).toContain("Alteration · talent");
    expect(html).toContain("Extra Trait");
    expect(html).toContain("Alteration · feat");
    expect(html).toContain("Shifter");
    expect(html).toContain("Class · Alteration specialist");
    expect(html).toContain('src="/img/shifter.png"');
    expect(html).toContain("#si-alteration");
    expect(html).toContain("↑ ↓ navigate");
    expect(html).toContain("↵ open");
    expect(html).toContain("esc close");
    expect(html).toContain("/ to focus");
  });
});
