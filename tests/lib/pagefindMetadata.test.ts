import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPagefindFilters } from "../../src/lib/pagefindMetadata";

describe("native Pagefind facets V90", () => {
  it("indexes the exact metadata values and each tag as a separate filter value", () => {
    expect(
      buildPagefindFilters(
        {
          title: "Example",
          system: "Spheres of Guile",
          type: "talent",
          sphere: "Spellhacking",
          tags: "utility, magic, utility",
        },
        ["type:talent"],
      ),
    ).toEqual([
      "type:talent",
      "system:Spheres of Guile",
      "sphere:Spellhacking",
      "tags:utility",
      "tags:magic",
    ]);
  });

  it("uses the shared emitter on every existing Pagefind metadata owner", () => {
    for (const path of [
      "components/EntryDetailPage.astro",
      "components/PageHeading.astro",
      "layouts/ArticlePage.astro",
    ]) {
      const source = readFileSync(
        new URL(`../../src/${path}`, import.meta.url),
        "utf8",
      );
      expect(source).toContain("<PagefindMetadata");
      expect(source).not.toContain("data-pagefind-meta=");
    }
  });
});
