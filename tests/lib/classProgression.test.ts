import { describe, expect, it } from "vitest";
import {
  buildFeaturesByLevel,
  computeBAB,
  computeCasterLevel,
  computeMagicTalents,
  computeSave,
  formatBAB,
  parseClassTable,
} from "../../src/lib/classProgression";
import type { ClassFeatureEntry } from "../../src/lib/types";

describe("class progression", () => {
  it("calculates attack and save progressions", () => {
    expect(computeBAB(10, "full")).toBe(10);
    expect(computeBAB(10, "3/4")).toBe(7);
    expect(computeBAB(10, "half")).toBe(5);
    expect(computeSave(10, "good")).toBe(7);
    expect(computeSave(10, "poor")).toBe(3);
    expect(formatBAB(11)).toBe("+11/+6/+1");
  });

  it("uses bounded caster progression tables and tier formulas", () => {
    expect(computeCasterLevel(1, "high")).toBe(1);
    expect(computeCasterLevel(20, "mid")).toBe(15);
    expect(computeCasterLevel(20, "low")).toBe(10);
    expect(computeCasterLevel(21, "low")).toBe(0);
    expect(computeMagicTalents(4, "high")).toBe(6);
    expect(computeMagicTalents(4, "mid")).toBe(5);
    expect(computeMagicTalents(4, "low")).toBe(4);
  });

  it("parses nested class-table JSON and groups features by level", () => {
    expect(
      parseClassTable(
        JSON.stringify({
          extraHeaders: [],
          specialSource: {},
          extraRowData: {},
        }),
      ),
    ).toEqual({ extraHeaders: [], specialSource: {}, extraRowData: {} });
    expect(parseClassTable("not json")).toBeNull();

    const feature = (
      id: string,
      level: number | number[],
    ): ClassFeatureEntry => ({
      type: "class-feature",
      id,
      system: "power",
      name: id,
      sourceBook: "book",
      tags: [],
      className: "mage",
      level,
    });
    expect(
      buildFeaturesByLevel([
        feature("one", 1),
        feature("one-and-five", [1, 5]),
      ]),
    ).toEqual({
      1: [
        { id: "one", name: "one" },
        { id: "one-and-five", name: "one-and-five" },
      ],
      5: [{ id: "one-and-five", name: "one-and-five" }],
    });
  });
});
