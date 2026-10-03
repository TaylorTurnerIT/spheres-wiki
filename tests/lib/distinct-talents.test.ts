import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { contentEntryKey } from "../../src/lib/entryIdentity";
import { normalizeEntryData } from "../../src/lib/entryNormalization";
import * as resolution from "../../src/lib/resolveEntries";
import { buildSearchManifest } from "../../src/lib/searchManifest";
import { systemIdKey } from "../../src/lib/systems";
import type { TalentEntry } from "../../src/lib/types";

const contentRoot = path.resolve("src/content");
const cases = [
  {
    book: "ultimate-spheres-of-power",
    sphere: "death",
    id: "curse-death",
    name: "Curse",
    tags: ["curse", "ghost-strike"],
    rule: "spend 2 spell points to make a ghost strike that bestows a permanent curse",
  },
  {
    book: "ultimate-spheres-of-power",
    sphere: "fate",
    id: "curse",
    name: "Curse",
    tags: ["curse", "word"],
    rule: "spend a spell point as an immediate action to force that target to make the roll twice",
  },
  {
    book: "initiates-handbook",
    sphere: "mana",
    id: "bulwark-mana",
    name: "Bulwark",
    tags: ["manipulation"],
    rule: "This barrier has 1 layer, plus 1 layer per 10 caster levels",
  },
  {
    book: "ultimate-spheres-of-power",
    sphere: "protection",
    id: "bulwark",
    name: "Bulwark",
    tags: ["succor"],
    rule: "dismiss an aegis on an ally to give them DR/- equal to your caster level",
  },
];

function readTalent(testCase: (typeof cases)[number]) {
  const entryPath = `power/spheres/${testCase.sphere}/talents/${testCase.id}.md`;
  const text = fs.readFileSync(
    path.join(contentRoot, testCase.book, entryPath),
    "utf8",
  );
  const [, frontmatter, body] = text.split(/^---\r?$/m);
  const entry = {
    ...normalizeEntryData(parseYaml(frontmatter), entryPath),
    sourceBook: testCase.book,
  } as TalentEntry;
  const meta = parseYaml(
    fs.readFileSync(
      path.join(contentRoot, testCase.book, "_book.yaml"),
      "utf8",
    ),
  );
  return { entry, body, meta };
}

function realMaps() {
  const talents = cases.map(readTalent);
  const maps = resolution.buildResolvedMaps(
    talents.map(({ entry, meta }) => ({
      slug: entry.sourceBook,
      publishedDate: meta.publishedDate,
      sourceBookTitle: meta.title,
      entries: [entry],
    })),
  );
  for (const { entry, meta } of talents) {
    maps.bookMetaMap.set(entry.sourceBook, { ...meta, slug: entry.sourceBook });
  }
  return maps;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("V85 — real same-name talent content", () => {
  it.each(cases)(
    "preserves $sphere $name mechanics, tags and attribution",
    (testCase) => {
      const { entry, body } = readTalent(testCase);
      expect(entry).toMatchObject({
        type: "talent",
        system: "power",
        sphere: testCase.sphere,
        id: testCase.id,
        name: testCase.name,
        sourceBook: testCase.book,
      });
      expect(entry.tags).toEqual(testCase.tags);
      expect(entry.dualSphere).toBeUndefined();
      expect(body).toContain(testCase.rule);
    },
  );

  it("resolves all four entries without identity loss or source changes", () => {
    const maps = realMaps();
    expect(maps.talentMap.size).toBe(4);
    for (const { id, sphere, book } of cases) {
      expect(maps.talentMap.get(systemIdKey("power", id))?.sphere).toBe(sphere);
      expect(
        maps.entrySourceBook.get(contentEntryKey("talent", "power", id)),
      ).toBe(book);
    }
  });

  it("exposes both same-name pairs as separate search results", async () => {
    vi.stubEnv("BASE_URL", "/spheres-wiki/");
    vi.spyOn(resolution, "resolveEntries").mockResolvedValue(realMaps());
    const manifest = await buildSearchManifest();
    expect(manifest).toHaveLength(4);
    for (const { id, sphere, name } of cases) {
      expect(manifest).toContainEqual(
        expect.objectContaining({
          title: name,
          type: "talent",
          url: `/spheres-wiki/power/${sphere}/${id}/`,
        }),
      );
    }
  });
});
