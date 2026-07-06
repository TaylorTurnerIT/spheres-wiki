import { describe, expect, it } from "vitest";
import { levelLabel, ordinal } from "../../src/lib/levelLabel";

describe("ordinal", () => {
  it("handles 1st/2nd/3rd", () => {
    expect(ordinal(1)).toBe("st");
    expect(ordinal(2)).toBe("nd");
    expect(ordinal(3)).toBe("rd");
  });

  it("handles the 11-13 exception", () => {
    expect(ordinal(11)).toBe("th");
    expect(ordinal(12)).toBe("th");
    expect(ordinal(13)).toBe("th");
    expect(ordinal(111)).toBe("th");
  });

  it("handles general cases", () => {
    expect(ordinal(4)).toBe("th");
    expect(ordinal(10)).toBe("th");
    expect(ordinal(20)).toBe("th");
    expect(ordinal(21)).toBe("st");
    expect(ordinal(22)).toBe("nd");
    expect(ordinal(23)).toBe("rd");
    expect(ordinal(100)).toBe("th");
  });
});

describe("levelLabel", () => {
  it("formats a single level", () => {
    expect(levelLabel(1)).toBe("1st");
    expect(levelLabel(20)).toBe("20th");
  });

  it("formats level arrays as a comma list", () => {
    expect(levelLabel([3, 5, 11])).toBe("3rd, 5th, 11th");
  });
});
