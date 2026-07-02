import { describe, expect, it } from "vitest";
import {
  buildFeatBrowseEntry,
  extractExcerpt,
  extractPrerequisites,
} from "../../src/lib/featBrowse";
import type { BookMeta, FeatEntry, SphereEntry, TagEntry } from "../../src/lib/types";

describe("extractPrerequisites", () => {
  it("extracts the Prerequisites line and strips markdown", () => {
    const body = "**Prerequisites:** Alchemy sphere ((poison) package), Nature sphere.\n\n**Benefit:** Does a thing.";
    expect(extractPrerequisites(body)).toBe(
      "Alchemy sphere ((poison) package), Nature sphere.",
    );
  });

  it("returns undefined when there is no Prerequisites line", () => {
    const body = "Miracles of any shape fail to penetrate your defenses.\n\n**Benefit:** Something.";
    expect(extractPrerequisites(body)).toBeUndefined();
  });

  it("also matches the singular 'Prerequisite:' label used by some feats", () => {
    const body = "**Prerequisite:** Basic Magic Training or casting class feature.\n\n**Benefit:** Something.";
    expect(extractPrerequisites(body)).toBe(
      "Basic Magic Training or casting class feature.",
    );
  });

  it("returns undefined for empty/undefined bodies", () => {
    expect(extractPrerequisites(undefined)).toBeUndefined();
    expect(extractPrerequisites("")).toBeUndefined();
  });
});

describe("extractExcerpt", () => {
  it("uses the Benefit paragraph when there's no flavor text", () => {
    const body = "**Prerequisites:** Foo.\n\n**Benefit:** You gain a +2 bonus to all things.";
    expect(extractExcerpt(body)).toBe("You gain a +2 bonus to all things.");
  });

  it("falls back to leading flavor text when present", () => {
    const body =
      "Miracles of any shape fail to penetrate your defenses.\n\n**Benefit:** Any spell or power resistance applies broadly.";
    expect(extractExcerpt(body)).toBe(
      "Miracles of any shape fail to penetrate your defenses.",
    );
  });

  it("strips markdown links, bold, and italics", () => {
    const body = "**Benefit:** See the [Alchemy sphere](/power/alchemy/) and *its* talents for **details**.";
    expect(extractExcerpt(body)).toBe(
      "See the Alchemy sphere and its talents for details.",
    );
  });

  it("truncates long paragraphs at a word boundary with an ellipsis", () => {
    const long = "word ".repeat(60).trim();
    const excerpt = extractExcerpt(`**Benefit:** ${long}`, 40);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("returns an empty string for empty/undefined bodies", () => {
    expect(extractExcerpt(undefined)).toBe("");
    expect(extractExcerpt("")).toBe("");
  });
});

describe("buildFeatBrowseEntry", () => {
  const tagMap = new Map<string, TagEntry>([
    [
      "champion",
      {
        type: "tag",
        id: "champion",
        label: "Champion",
        priority: 5,
        description: "Champion feats.",
        sourceBook: "__built-in__",
        featCategory: true,
      },
    ],
  ]);
  const bookMetaMap = new Map<string, BookMeta>([
    [
      "core",
      {
        slug: "core",
        title: "Core Book",
        publisher: "Drop Dead Studios",
        publishedDate: "2020-01-01",
      },
    ],
  ]);
  const sphereMap = new Map<string, SphereEntry>();

  function makeFeat(overrides: Partial<FeatEntry> = {}): FeatEntry {
    return {
      type: "feat",
      id: "noxious-fog",
      system: "might",
      name: "Noxious Fog",
      sourceBook: "core",
      tags: ["champion"],
      ...overrides,
    };
  }

  it("builds a full browse row without ever needing a rendered Content component", () => {
    const feat = makeFeat();
    const entry = buildFeatBrowseEntry(feat, {
      tagMap,
      bookMetaMap,
      sphereMap,
      rawBody: "**Prerequisites:** Alchemy sphere.\n\n**Benefit:** Spreads poison.",
      resolveUrl: (path) => `/spheres-wiki${path}`,
    });

    expect(entry).toMatchObject({
      id: "noxious-fog",
      key: "core:noxious-fog",
      name: "Noxious Fog",
      href: "/spheres-wiki/might/feats/champion/noxious-fog/",
      system: "might",
      category: "champion",
      categoryLabel: "Champion",
      sourceBook: "core",
      sourceBookTitle: "Core Book",
      prerequisites: "Alchemy sphere.",
      excerpt: "Spreads poison.",
    });
    expect(entry.tags).toContain("champion");
    expect(entry.tags).toContain("feat");
  });

  it("defaults href resolution to identity when resolveUrl is omitted", () => {
    const entry = buildFeatBrowseEntry(makeFeat(), { tagMap, bookMetaMap, sphereMap });
    expect(entry.href).toBe("/might/feats/champion/noxious-fog/");
  });

  it("falls back to General when the feat has no category tag or sphere", () => {
    const entry = buildFeatBrowseEntry(
      makeFeat({ tags: [], sphere: undefined }),
      { tagMap, bookMetaMap, sphereMap },
    );
    expect(entry.categoryLabel).toBe("General");
  });

  it("uses the sphere name as category label for sphere-focused feats", () => {
    const sphereMapWithFate = new Map<string, SphereEntry>([
      [
        "sphere:fate",
        {
          type: "sphere",
          id: "fate",
          system: "power",
          name: "Fate",
          icon: "fate",
          sourceBook: "core",
          tags: [],
        },
      ],
    ]);
    const entry = buildFeatBrowseEntry(
      makeFeat({ tags: [], sphere: "fate", system: "power" }),
      { tagMap, bookMetaMap, sphereMap: sphereMapWithFate },
    );
    expect(entry.categoryLabel).toBe("Fate");
  });

  it("handles a missing raw body gracefully (no prerequisites, empty excerpt)", () => {
    const entry = buildFeatBrowseEntry(makeFeat(), { tagMap, bookMetaMap, sphereMap });
    expect(entry.prerequisites).toBeUndefined();
    expect(entry.excerpt).toBe("");
  });
});
