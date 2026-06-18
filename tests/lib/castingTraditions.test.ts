import { describe, expect, it } from "vitest";
import {
  exportTraditionJson,
  exportTraditionMarkdown,
} from "../../src/lib/castingTraditions/export";
import {
  buildTraditionState,
  calculateAvailableBoonSlots,
  calculateGeneralDrawbackValue,
  getAllowedCastingAbilities,
  validateTradition,
} from "../../src/lib/castingTraditions/rules";
import type {
  TraditionData,
  TraditionSelection,
} from "../../src/lib/castingTraditions/types";

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

  it("allows Constitution CAM when Fortified Casting prerequisites are met", () => {
    const selection: TraditionSelection = {
      cam: "con",
      drawbacks: [{ id: "draining-casting" }, { id: "somatic-casting" }],
      boons: [{ id: "fortified-casting" }],
    };
    const state = buildTraditionState(selection, data);

    expect(getAllowedCastingAbilities(state)).toContain("con");
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

    expect(markdown).toContain("### Blood Test");
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
});
