import { describe, expect, it } from "vitest";
import {
  assignSystemUniqueIds,
  contentEntryKey,
  sourceBookInitials,
} from "../../src/lib/entryIdentity";

describe("sourceBookInitials", () => {
  it("returns clean lowercase initials", () => {
    expect(sourceBookInitials("The Spheres: Expanded!", "fallback")).toBe(
      "tse",
    );
  });

  it("falls back to the slug when a title has no usable characters", () => {
    expect(sourceBookInitials("!!!", "book-of-options")).toBe(
      "book-of-options",
    );
  });
});

describe("assignSystemUniqueIds", () => {
  it("keeps the oldest id and suffixes later same-system entries", () => {
    const assigned = assignSystemUniqueIds([
      {
        sourceBook: "new-book",
        sourceBookTitle: "New Book",
        publishedDate: "2024-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "power" },
      },
      {
        sourceBook: "old-book",
        sourceBookTitle: "Old Book",
        publishedDate: "2020-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "power" },
      },
    ]);

    expect(assigned).toHaveLength(2);
    expect(
      assigned.find((record) => record.sourceBook === "old-book")?.entry.id,
    ).toBe("ability");
    expect(
      assigned.find((record) => record.sourceBook === "new-book")?.entry.id,
    ).toBe("ability-nb");
  });

  it("allows the same id in different systems", () => {
    const assigned = assignSystemUniqueIds([
      {
        sourceBook: "power-book",
        publishedDate: "2020-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "power" },
      },
      {
        sourceBook: "might-book",
        publishedDate: "2021-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "might" },
      },
    ]);

    expect(assigned.map((record) => record.entry.id)).toEqual([
      "ability",
      "ability",
    ]);
    expect(
      new Set(
        assigned.map((record) =>
          contentEntryKey(
            record.entry.type,
            record.entry.system,
            record.entry.id,
          ),
        ),
      ).size,
    ).toBe(2);
  });

  it("does not steal an explicit suffix id", () => {
    const assigned = assignSystemUniqueIds([
      {
        sourceBook: "old-book",
        sourceBookTitle: "Old Book",
        publishedDate: "2020-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "power" },
      },
      {
        sourceBook: "named-book",
        sourceBookTitle: "New Book",
        publishedDate: "2021-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability-nb", system: "power" },
      },
      {
        sourceBook: "new-book",
        sourceBookTitle: "New Book",
        publishedDate: "2022-01-01",
        sourceIndex: 0,
        entry: { type: "talent", id: "ability", system: "power" },
      },
    ]);

    expect(
      assigned.find((record) => record.sourceBook === "new-book")?.entry.id,
    ).toBe("ability-nb-2");
  });
});
