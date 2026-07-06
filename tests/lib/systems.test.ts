import { describe, expect, it } from "vitest";
import {
  buildSystemIdIndex,
  systemCssKey,
  systemIdKey,
} from "../../src/lib/systems";

describe("systemIdKey", () => {
  it("builds a system-scoped key", () => {
    expect(systemIdKey("power", "alteration")).toBe("power:alteration");
  });
});

describe("buildSystemIdIndex", () => {
  const entries = [
    { id: "alteration", system: "power", name: "Alteration (Power)" },
    { id: "alteration", system: "might", name: "Alteration (Might)" },
    { id: "athletics", system: "might", name: "Athletics" },
  ];

  it("indexes entries by system and id", () => {
    const index = buildSystemIdIndex(entries);
    expect(index.get(systemIdKey("power", "alteration"))?.name).toBe(
      "Alteration (Power)",
    );
    expect(index.get(systemIdKey("might", "athletics"))?.name).toBe(
      "Athletics",
    );
    expect(index.get(systemIdKey("guile", "alteration"))).toBeUndefined();
  });

  it("keeps the first entry on collisions, matching find() semantics", () => {
    const index = buildSystemIdIndex([
      { id: "smash", system: "might", name: "first" },
      { id: "smash", system: "might", name: "second" },
    ]);
    expect(index.get(systemIdKey("might", "smash"))?.name).toBe("first");
  });
});

describe("systemCssKey", () => {
  it("maps champions to its short css key", () => {
    expect(systemCssKey("champions")).toBe("champ");
  });

  it("passes through ids that match their css key", () => {
    expect(systemCssKey("power")).toBe("power");
  });

  it("falls back to the raw id for unknown systems", () => {
    expect(systemCssKey("pf1e")).toBe("pf1e");
  });
});
