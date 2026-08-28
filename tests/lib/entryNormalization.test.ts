import { describe, expect, it } from "vitest";
import { normalizeEntryData } from "../../src/lib/entryNormalization";

describe("normalizeEntryData", () => {
  it("lets path-derived identity override contradictory legacy fields", () => {
    expect(
      normalizeEntryData(
        {
          id: "wrong-id",
          name: "Alter Shape",
          system: "might",
          type: "feat",
        },
        "power/spheres/alteration/talents/alter-shape.md",
      ),
    ).toMatchObject({
      id: "alter-shape",
      system: "power",
      type: "talent",
      sphere: "alteration",
    });
  });

  it("uses legacy or book system metadata only when the path is neutral", () => {
    expect(
      normalizeEntryData(
        { id: "about", type: "article", name: "About" },
        "articles/about.md",
        "power",
      ),
    ).toMatchObject({ id: "about", type: "article", system: "power" });
  });
});
