import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  exportTraditionJson,
  exportTraditionMarkdown,
} from "../../src/lib/castingTraditions/export";
import {
  buildTraditionState,
  calculateAvailableBoonSlots,
  calculateGeneralDrawbackValue,
  getAllowedCastingAbilities,
  selectionFromTradition,
  validateTradition,
} from "../../src/lib/castingTraditions/rules";
import type {
  TraditionData,
  TraditionSelection,
} from "../../src/lib/castingTraditions/types";
import type { TraditionEntry } from "../../src/lib/types";

function allowedAbilityIds(
  selection: TraditionSelection,
  testData: TraditionData,
) {
  return getAllowedCastingAbilities(
    buildTraditionState(selection, testData),
  ).map((a) => a.ability);
}

const data: TraditionData = {
  drawbacks: [
    {
      type: "drawback",
      id: "draining-casting",
      system: "power",
      name: "Draining Casting",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      drawbackKind: "general",
      drawbackValue: 1,
    },
    {
      type: "drawback",
      id: "somatic-casting",
      system: "power",
      name: "Somatic Casting",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      drawbackKind: "general",
      drawbackValue: 1,
    },
    {
      type: "drawback",
      id: "focus-casting",
      system: "power",
      name: "Focus Casting",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      drawbackKind: "general",
      drawbackValue: 1,
      incompatible: ["galvanized"],
    },
    {
      type: "drawback",
      id: "galvanized",
      system: "power",
      name: "Galvanized",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      drawbackKind: "general",
      drawbackValue: 1,
      incompatible: ["focus-casting"],
    },
    {
      type: "drawback",
      id: "lycanthropic",
      system: "power",
      name: "Lycanthropic",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      drawbackKind: "sphere",
      drawbackValue: 1,
      sphere: "alteration",
    },
    {
      type: "drawback",
      id: "card-casting",
      system: "power",
      name: "Card Casting",
      sourceBook: "expanded-spheres-cardcasters-gamble",
      tags: [],
      drawbackKind: "general",
      drawbackValue: 1,
      choices: [
        {
          id: "card-casting-core",
          label: "Card Casting core modifications",
          selector: "drawback",
          max: 3,
          options: [
            { id: "cooldown", label: "Cooldown", addsDrawbackValue: 1 },
            { id: "mana-pool", label: "Mana Pool", addsDrawbackValue: 1 },
            {
              id: "mana-graveyard",
              label: "Mana Graveyard",
              addsDrawbackValue: 1,
              requires: {
                all: [{ choice: "cooldown" }, { choice: "mana-pool" }],
              },
            },
          ],
        },
        {
          id: "card-casting-secondary",
          label: "Card Casting secondary modifications",
          selector: "drawback",
          options: [
            {
              id: "gradual-ramp",
              label: "Gradual Ramp",
              addsDrawbackValue: 1,
              requires: { choice: "mana-pool" },
            },
          ],
        },
      ],
    },
  ],
  boons: [
    {
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
    },
    {
      type: "boon",
      id: "easy-focus",
      system: "power",
      name: "Easy Focus",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      boonCost: 1,
    },
    {
      type: "boon",
      id: "empowered-abilities",
      system: "power",
      name: "Empowered Abilities",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      boonCost: 1,
    },
  ],
  traditions: [
    {
      type: "tradition",
      id: "spellscourged",
      system: "power",
      name: "Spellscourged",
      sourceBook: "expanded-options-3",
      tags: [],
      traditionKind: "custom",
      magicType: "custom",
      cam: { mode: "choose-one", abilities: ["cha", "con"] },
      drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
      sphereDrawbacks: [],
      boons: [],
      choices: [
        {
          id: "spellscourged-boon",
          label: "Spellscourged boon",
          selector: "boon",
          min: 1,
          max: 1,
          options: [
            {
              id: "empowered-abilities",
              label: "Empowered Abilities",
              grants: [{ id: "empowered-abilities", kind: "boon" }],
            },
            {
              id: "fortified-casting",
              label: "Fortified Casting",
              grants: [{ id: "fortified-casting", kind: "boon" }],
            },
          ],
        },
      ],
    },
    {
      type: "tradition",
      id: "card-crusader",
      system: "power",
      name: "Card Crusader",
      sourceBook: "ultimate-spheres-of-power",
      tags: [],
      traditionKind: "card",
      magicType: "custom",
      cam: { mode: "choose-one", abilities: ["int", "wis", "cha"] },
      drawbacks: [{ id: "card-casting" }],
      sphereDrawbacks: [],
      boons: [],
      choiceSelections: {
        "card-casting-core": ["cooldown"],
      },
    },
  ],
};

describe("casting tradition builder logic", () => {
  it("counts only general drawbacks as boon currency", () => {
    const state = buildTraditionState(
      {
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        sphereDrawbacks: [{ id: "lycanthropic" }],
        boons: [],
      },
      data,
    );

    expect(calculateGeneralDrawbackValue(state)).toBe(2);
    expect(calculateAvailableBoonSlots(state)).toBe(1);
  });

  it("supports repeated drawback selections", () => {
    const state = buildTraditionState(
      {
        drawbacks: [{ id: "somatic-casting", count: 2 }],
        boons: [],
      },
      data,
    );

    expect(calculateGeneralDrawbackValue(state)).toBe(2);
  });

  it("counts selected choice drawback values", () => {
    const state = buildTraditionState(
      {
        drawbacks: [{ id: "card-casting" }],
        boons: [],
        choices: {
          "card-casting-core": ["cooldown", "mana-pool", "mana-graveyard"],
          "card-casting-secondary": ["gradual-ramp"],
        },
      },
      data,
    );

    expect(calculateGeneralDrawbackValue(state)).toBe(5);
  });

  it("applies tradition preset choice selections", () => {
    const state = buildTraditionState(
      {
        traditionId: "card-crusader",
        drawbacks: [{ id: "card-casting" }],
        boons: [],
      },
      data,
    );

    expect(state.selection.choices).toEqual({
      "card-casting-core": ["cooldown"],
    });
    expect(calculateGeneralDrawbackValue(state)).toBe(2);
  });

  it("rejects selected choice options with unmet prerequisites", () => {
    const diagnostics = validateTradition(
      {
        drawbacks: [{ id: "card-casting" }],
        boons: [],
        choices: {
          "card-casting-core": ["mana-graveyard"],
        },
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "missing-choice-prerequisite",
    );
  });

  it("allows Constitution CAM when Fortified Casting prerequisites are met", () => {
    const selection: TraditionSelection = {
      cam: "con",
      drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
      boons: [{ id: "fortified-casting" }],
    };
    const state = buildTraditionState(selection, data);

    expect(getAllowedCastingAbilities(state).map((c) => c.ability)).toContain(
      "con",
    );
    expect(validateTradition(selection, data)).toEqual([]);
  });

  it("rejects Fortified Casting without Draining Casting", () => {
    const diagnostics = validateTradition(
      {
        cam: "con",
        drawbacks: [{ id: "somatic-casting", count: 2 }],
        boons: [{ id: "fortified-casting" }],
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "missing-prerequisite",
    );
  });

  it("rejects incompatible selections", () => {
    const diagnostics = validateTradition(
      {
        drawbacks: [{ id: "focus-casting" }, { id: "galvanized" }],
        boons: [],
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "incompatible-selection",
    );
  });

  it("rejects boons that exceed available drawback currency", () => {
    const diagnostics = validateTradition(
      {
        drawbacks: [{ id: "somatic-casting" }],
        boons: [{ id: "easy-focus" }],
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "insufficient-drawbacks",
    );
  });

  it("exports Markdown in the existing tradition style", () => {
    const markdown = exportTraditionMarkdown(
      {
        name: "Blood Test",
        cam: "con",
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        boons: [{ id: "fortified-casting" }],
      },
      data,
    );

    expect(markdown).toContain("# Blood Test");
    expect(markdown).toContain("**Casting Ability Modifier:** CON");
    expect(markdown).toContain(
      "**Drawbacks:** Draining Casting, Somatic Casting",
    );
    expect(markdown).toContain("**Boons:** Fortified Casting");
  });

  it("exports structured JSON", () => {
    const exported = JSON.parse(
      exportTraditionJson(
        {
          name: "Blood Test",
          cam: "con",
          drawbacks: [{ id: "draining-casting" }],
          boons: [],
        },
        data,
      ),
    );

    expect(exported).toMatchObject({
      name: "Blood Test",
      cam: "con",
      drawbacks: [{ id: "draining-casting", name: "Draining Casting" }],
    });
  });

  it("preserves selected choice ids in structured JSON", () => {
    const exported = JSON.parse(
      exportTraditionJson(
        {
          name: "Choice Test",
          drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
          boons: [],
          choices: {
            "spellscourged-boon": ["fortified-casting"],
          },
        },
        data,
      ),
    );

    expect(exported.choices).toEqual({
      "spellscourged-boon": ["fortified-casting"],
    });
  });

  it("applies selected choice grants to the resolved state", () => {
    const state = buildTraditionState(
      {
        traditionId: "spellscourged",
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        boons: [],
        choices: {
          "spellscourged-boon": ["fortified-casting"],
        },
      },
      data,
    );

    expect(state.boons.map(({ entry }) => entry.id)).toEqual([
      "fortified-casting",
    ]);
    expect(validateTradition(state.selection, data)).toEqual([]);
  });

  it("rejects missing required choices", () => {
    const diagnostics = validateTradition(
      {
        traditionId: "spellscourged",
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        boons: [],
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "missing-choice",
    );
  });

  it("rejects too many selected choice options", () => {
    const diagnostics = validateTradition(
      {
        traditionId: "spellscourged",
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        boons: [],
        choices: {
          "spellscourged-boon": ["fortified-casting", "empowered-abilities"],
        },
      },
      data,
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "too-many-choices",
    );
  });

  // B19/B22: tradition cam mode applied, AllowedCam mode annotated
  it("fixed cam tradition restricts to the specified ability", () => {
    const tradition: TraditionEntry = {
      type: "tradition",
      id: "t-fixed",
      name: "Fixed Tradition",
      system: "power",
      sourceBook: "test",
      tags: [],
      traditionKind: "standard",
      cam: { mode: "fixed", abilities: ["con"] },
      drawbacks: [],
      sphereDrawbacks: [],
      boons: [],
    };
    const testData: TraditionData = {
      drawbacks: [],
      boons: [],
      traditions: [tradition],
    };
    const selection = selectionFromTradition(tradition, testData);
    expect(selection.cam).toBe("con");
    const state = buildTraditionState(selection, testData);
    const allowed = getAllowedCastingAbilities(state);
    const ids = allowed.map((a) => a.ability);
    expect(ids).toEqual(["con"]);
    expect(allowed.find((a) => a.ability === "con")?.mode).toBe("fixed");
    // int/wis/cha must not appear
    expect(ids).not.toContain("int");
    expect(ids).not.toContain("wis");
    expect(ids).not.toContain("cha");
  });

  // B19: highest cam mode restricts to listed abilities (not default int/wis/cha)
  it("highest cam tradition restricts to specified abilities with if-higher-than-base mode", () => {
    const tradition: TraditionEntry = {
      type: "tradition",
      id: "t-highest",
      name: "Highest Tradition",
      system: "power",
      sourceBook: "test",
      tags: [],
      traditionKind: "standard",
      cam: { mode: "highest", abilities: ["cha", "con"] },
      drawbacks: [],
      sphereDrawbacks: [],
      boons: [],
    };
    const testData: TraditionData = {
      drawbacks: [],
      boons: [],
      traditions: [tradition],
    };
    const selection = selectionFromTradition(tradition, testData);
    expect(selection.cam).toBeUndefined();
    const allowed = getAllowedCastingAbilities(
      buildTraditionState(selection, testData),
    );
    const ids = allowedAbilityIds(selection, testData);
    expect(ids).toContain("cha");
    expect(ids).toContain("con");
    expect(ids).not.toContain("int");
    expect(ids).not.toContain("wis");
    expect(allowed.find((a) => a.ability === "con")?.mode).toBe(
      "if-higher-than-base",
    );
  });

  // B21: boon choice addsDrawbackValue must not fund boon slots
  it("boon choice addsDrawbackValue does not increase boon currency", () => {
    const boonWithChoiceValue = {
      type: "boon" as const,
      id: "boon-with-choice",
      system: "power",
      name: "Boon With Choice",
      sourceBook: "test",
      tags: [],
      boonCost: 1,
      choices: [
        {
          id: "boon-choice",
          label: "Boon Choice",
          selector: "boon" as const,
          options: [{ id: "opt1", label: "Opt 1", addsDrawbackValue: 5 }],
        },
      ],
    };
    const testData: TraditionData = {
      drawbacks: data.drawbacks,
      boons: [...data.boons, boonWithChoiceValue],
    };
    const state = buildTraditionState(
      {
        drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
        boons: [{ id: "boon-with-choice" }],
        choices: { "boon-choice": ["opt1"] },
      },
      testData,
    );
    // General drawback value must be 2 (draining + somatic), not 7 (2 + 5 from boon choice)
    expect(calculateGeneralDrawbackValue(state)).toBe(2);
    expect(calculateAvailableBoonSlots(state)).toBe(1);
  });

  // B22: allow-cam rule annotates ability with correct mode
  it("allow-cam rule annotates ability with if-higher-than-base mode", () => {
    const selection: TraditionSelection = {
      drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
      boons: [{ id: "fortified-casting" }],
    };
    const state = buildTraditionState(selection, data);
    const allowed = getAllowedCastingAbilities(state);
    const conEntry = allowed.find((c) => c.ability === "con");
    expect(conEntry).toBeDefined();
    expect(conEntry?.mode).toBe("if-higher-than-base");
  });

  // B20: selectionFromTradition pre-populates from tradition entry
  it("selectionFromTradition pre-populates drawbacks, boons, and choices", () => {
    const tradition = data.traditions?.[0]; // spellscourged
    if (!tradition) throw new Error("tradition is undefined");
    const selection = selectionFromTradition(tradition, data);
    expect(selection.traditionId).toBe("spellscourged");
    expect(selection.drawbacks).toEqual([
      { id: "draining-casting" },
      { id: "somatic-casting" },
    ]);
    expect(selection.boons).toEqual([]);
    expect(selection.cam).toBeUndefined(); // choose-one with 2 abilities → no pre-set
  });

  // Export: boons empty with spell-point bonus must not show "None;"
  it("exports Markdown with only bonus spell points when no boons selected", () => {
    const markdown = exportTraditionMarkdown(
      {
        name: "No Boons",
        cam: "int",
        drawbacks: [{ id: "draining-casting" }],
        boons: [],
      },
      data,
    );
    // unspentDrawbacks = 1, bonus = "+1, +1 per 6 levels..."
    expect(markdown).not.toContain("**Boons:** None;");
    expect(markdown).toContain("**Boons:** +1, +1 per 6 levels");
  });
});

// Integration test: drives logic from real content files (V67)
describe("casting tradition integration (real content)", () => {
  const contentRoot = path.resolve(__dirname, "../../src/content");

  function readFrontmatter(filePath: string): Record<string, unknown> {
    const raw = fs.readFileSync(filePath, "utf-8");
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    return parseYaml(match[1]) as Record<string, unknown>;
  }

  function traditionFromFile(
    relativePath: string,
    id: string,
    sourceBook: string,
    fallbackName: string,
  ): TraditionEntry | null {
    const filePath = path.join(contentRoot, relativePath);
    if (!fs.existsSync(filePath)) return null;
    const fm = readFrontmatter(filePath);
    return {
      type: "tradition",
      id,
      name: (fm.name as string) ?? fallbackName,
      system: "power",
      sourceBook,
      tags: [],
      traditionKind: "custom",
      magicType: fm.magicType as TraditionEntry["magicType"],
      cam: fm.cam as TraditionEntry["cam"],
      drawbacks: (fm.drawbacks as TraditionEntry["drawbacks"]) ?? [],
      sphereDrawbacks:
        (fm.sphereDrawbacks as TraditionEntry["sphereDrawbacks"]) ?? [],
      boons: (fm.boons as TraditionEntry["boons"]) ?? [],
    };
  }

  it("Blood Magic tradition has correct fixed CAM (con only)", () => {
    const tradition = traditionFromFile(
      "ultimate-spheres-of-power/power/casting-traditions/traditions/custom/blood-magic.md",
      "blood-magic",
      "ultimate-spheres-of-power",
      "Blood Magic",
    );
    if (!tradition) return;

    const testData: TraditionData = {
      drawbacks: [],
      boons: [],
      traditions: [tradition],
    };
    const selection = selectionFromTradition(tradition, testData);

    // Blood Magic cam is fixed [con]
    expect(selection.cam).toBe("con");
    expect(selection.traditionId).toBe("blood-magic");

    const ids = allowedAbilityIds(selection, testData);

    expect(ids).toContain("con");
    expect(ids).not.toContain("int");
    expect(ids).not.toContain("wis");

    // Validate with correct CAM — no invalid-cam diagnostics
    const diagnostics = validateTradition(
      { ...selection, cam: "con" },
      testData,
    );
    expect(diagnostics.filter((d) => d.code === "invalid-cam")).toHaveLength(0);

    // Validate with int CAM — must get invalid-cam diagnostic
    const intDiagnostics = validateTradition(
      { ...selection, cam: "int" },
      testData,
    );
    expect(intDiagnostics.some((d) => d.code === "invalid-cam")).toBe(true);
  });

  it("Demonology tradition has correct highest CAM (cha/con, not int/wis)", () => {
    const tradition = traditionFromFile(
      "spheres-bestiary-desert-encounters/power/casting-traditions/traditions/custom/demonology.md",
      "demonology",
      "spheres-bestiary-desert-encounters",
      "Demonology",
    );
    if (!tradition) return;

    const testData: TraditionData = {
      drawbacks: [],
      boons: [],
      traditions: [tradition],
    };
    const selection = selectionFromTradition(tradition, testData);

    // highest with [cha, con] — no pre-set cam
    expect(selection.cam).toBeUndefined();

    const allowed = getAllowedCastingAbilities(
      buildTraditionState(selection, testData),
    );
    const ids = allowedAbilityIds(selection, testData);

    expect(ids).toContain("cha");
    expect(ids).toContain("con");
    expect(ids).not.toContain("int");
    expect(ids).not.toContain("wis");

    // con should be annotated if-higher-than-base
    expect(allowed.find((a) => a.ability === "con")?.mode).toBe(
      "if-higher-than-base",
    );
  });
});

import type {
  BuilderStore,
  SelectedIds,
} from "../../src/lib/castingTraditions/builderHelpers";
// Phase 1-5 tests: builderHelpers, detailed export, manual adjustments, CAM override
import {
  canSelectEntry,
  filterByText,
  formatIncompatibleName,
  groupBySphere,
  isSafeFix,
  prerequisiteExcerpt,
} from "../../src/lib/castingTraditions/builderHelpers";

describe("builderHelpers", () => {
  const mockStore: BuilderStore = {
    drawbacks: [
      {
        id: "d1",
        name: "Zebra Drawback",
        drawbackKind: "general",
        drawbackValue: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "Desc 1",
      },
      {
        id: "d2",
        name: "Alpha Drawback",
        drawbackKind: "general",
        drawbackValue: 2,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "Desc 2",
      },
      {
        id: "sd1",
        name: "Conduit Focus",
        drawbackKind: "sphere",
        drawbackValue: 1,
        sphere: "alteration",
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
      },
      {
        id: "sd2",
        name: "War Focus",
        drawbackKind: "sphere",
        drawbackValue: 1,
        sphere: "war",
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
      },
      {
        id: "dual1",
        name: "Dual Focus",
        drawbackKind: "dual-sphere",
        drawbackValue: 1,
        spheres: ["alteration", "war"],
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
      },
      {
        id: "prereq-target",
        name: "Target Drawback",
        drawbackKind: "general",
        drawbackValue: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
        requires: { all: [{ drawback: "d1" }] },
      },
      {
        id: "incompat-a",
        name: "Incompat A",
        drawbackKind: "general",
        drawbackValue: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
        incompatible: ["incompat-b"],
      },
      {
        id: "incompat-b",
        name: "Incompat B",
        drawbackKind: "general",
        drawbackValue: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
        incompatible: ["incompat-a"],
      },
    ],
    boons: [
      {
        id: "b1",
        name: "Boon One",
        boonCost: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
      },
      {
        id: "b2",
        name: "Boon Two",
        boonCost: 2,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
      },
      {
        id: "b-needs-boon",
        name: "Needy Boon",
        boonCost: 1,
        sourceBookTitle: "Test",
        tags: [],
        bodyHtml: "",
        bodyPlain: "",
        requires: { boon: "b1" },
      },
    ],
    traditions: [],
  };

  it("filterByText filters by name", () => {
    const filtered = filterByText(mockStore.drawbacks, "alpha");
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("Alpha Drawback");
  });

  it("filterByText is case-insensitive", () => {
    const filtered = filterByText(mockStore.drawbacks, "ZEBRA");
    expect(filtered.length).toBe(1);
  });

  it("filterByText returns all when query empty", () => {
    const filtered = filterByText(mockStore.drawbacks, "");
    expect(filtered.length).toBe(8);
  });

  it("groupBySphere groups and sorts by sphere", () => {
    const grouped = groupBySphere(
      mockStore.drawbacks.filter((d) => d.drawbackKind !== "general"),
    );
    const keys = [...grouped.keys()];
    expect(keys[0]).toBe("alteration");
    expect(keys[1]).toBe("alteration/war");
    expect(keys[2]).toBe("war");
  });

  it("formatIncompatibleName resolves id to name", () => {
    expect(formatIncompatibleName("incompat-b", mockStore)).toBe("Incompat B");
    expect(formatIncompatibleName("nonexistent", mockStore)).toBe(
      "nonexistent",
    );
  });

  it("prerequisiteExcerpt returns human-readable text", () => {
    const drawback = mockStore.drawbacks.find((d) => d.id === "prereq-target");
    if (!drawback) throw new Error("drawback is undefined");
    expect(prerequisiteExcerpt(drawback as any, mockStore)).toContain(
      "Zebra Drawback",
    );
    expect(
      prerequisiteExcerpt({ requires: { drawback: "d1" } }, mockStore),
    ).toBe("Zebra Drawback");
    expect(prerequisiteExcerpt({ requires: { boon: "b1" } }, mockStore)).toBe(
      "Boon One",
    );
    expect(
      prerequisiteExcerpt(
        { requires: { all: [{ drawback: "d1" }, { boon: "b1" }] } },
        mockStore,
      ),
    ).toBe("Zebra Drawback and Boon One");
  });

  it("canSelectEntry allows valid additions", () => {
    const ids: SelectedIds = { drawbacks: [], sphereDrawbacks: [], boons: [] };
    expect(canSelectEntry("d1", "drawback", ids, mockStore, 0, 0).allowed).toBe(
      true,
    );
  });

  it("canSelectEntry blocks incompatible additions", () => {
    const ids: SelectedIds = {
      drawbacks: ["incompat-b"],
      sphereDrawbacks: [],
      boons: [],
    };
    const result = canSelectEntry(
      "incompat-a",
      "drawback",
      ids,
      mockStore,
      0,
      0,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("incompatible");
  });

  it("canSelectEntry blocks unmet prerequisites", () => {
    const ids: SelectedIds = { drawbacks: [], sphereDrawbacks: [], boons: [] };
    const result = canSelectEntry(
      "prereq-target",
      "drawback",
      ids,
      mockStore,
      0,
      0,
    );
    expect(result.allowed).toBe(false);
  });

  it("canSelectEntry checks boon currency", () => {
    // No drawbacks = 0 boon slots; boon b2 costs 2, can't select
    const ids: SelectedIds = { drawbacks: [], sphereDrawbacks: [], boons: [] };
    const result = canSelectEntry("b2", "boon", ids, mockStore, 0, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("only 0 boon slots");
  });

  it("isSafeFix identifies safe prerequisite fixes", () => {
    // prereq-target needs d1 — adding d1 should fix without new failures
    const ids: SelectedIds = {
      drawbacks: ["prereq-target"],
      sphereDrawbacks: [],
      boons: [],
    };
    const diag = {
      severity: "error" as const,
      code: "missing-prerequisite",
      message: "",
      sourceIds: ["prereq-target"],
    };
    expect(isSafeFix(diag, mockStore, ids)).toBe(true);
  });
});

describe("detailed export and JSON", () => {
  const testData: any = {
    drawbacks: [
      {
        type: "drawback",
        id: "d1",
        name: "Test Drawback",
        system: "power",
        sourceBook: "test",
        tags: [],
        drawbackKind: "general",
        drawbackValue: 1,
        bodyPlain: "This is the drawback text.",
      },
    ],
    boons: [
      {
        type: "boon",
        id: "b1",
        name: "Test Boon",
        system: "power",
        sourceBook: "test",
        tags: [],
        boonCost: 1,
        bodyHtml: "<p>Boon body</p>",
        bodyPlain: "Boon body",
      },
    ],
  };

  it("detailed Markdown includes body text", () => {
    const markdown = exportTraditionMarkdown(
      { name: "Test", cam: "int", drawbacks: [{ id: "d1" }], boons: [] },
      testData,
      true,
    );
    expect(markdown).toContain("## Drawbacks");
    expect(markdown).toContain("### Test Drawback");
    expect(markdown).toContain("> This is the drawback text.");
  });

  it("concise Markdown does not include body text", () => {
    const markdown = exportTraditionMarkdown(
      { name: "Test", cam: "int", drawbacks: [{ id: "d1" }], boons: [] },
      testData,
      false,
    );
    expect(markdown).not.toContain("## Drawbacks");
  });

  it("JSON includes bodyHtml and bodyPlain", () => {
    const json = JSON.parse(
      exportTraditionJson(
        {
          name: "Test",
          cam: "int",
          drawbacks: [{ id: "d1" }],
          boons: [{ id: "b1" }],
        },
        testData,
      ),
    );
    expect(json.drawbacks[0].bodyHtml).toBeDefined();
    expect(json.drawbacks[0].bodyPlain).toBeDefined();
    expect(json.boons[0].bodyHtml).toBe("<p>Boon body</p>");
    expect(json.boons[0].bodyPlain).toBe("Boon body");
  });

  it("JSON includes manual adjustment fields", () => {
    const json = JSON.parse(
      exportTraditionJson(
        {
          name: "Test",
          cam: "int",
          drawbacks: [],
          boons: [],
          camOverride: true,
        },
        { drawbacks: [], boons: [] },
      ),
    );
    expect(json.camOverride).toBe(true);
  });
});

describe("selectionFromTradition no magicType", () => {
  const tradition: any = {
    type: "tradition",
    id: "t1",
    name: "Test",
    system: "power",
    sourceBook: "test",
    tags: [],
    traditionKind: "custom",
    magicType: "arcane",
    cam: { mode: "choose-one", abilities: ["int", "wis"] },
    drawbacks: [{ id: "d1" }],
    boons: [],
  };

  it("does not include magicType in selection", () => {
    const sel = selectionFromTradition(tradition, { drawbacks: [], boons: [] });
    expect((sel as any).magicType).toBeUndefined();
  });
});
