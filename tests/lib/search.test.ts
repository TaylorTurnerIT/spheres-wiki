import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Search Weight Verification", () => {
  const pagesDir = path.resolve(__dirname, "../../src/pages");
  const pageHeadingPath = () =>
    path.resolve(__dirname, "../../src/components/PageHeading.astro");

  it('verifies that the entry detail shell has data-pagefind-weight="2.0"', () => {
    const shellPath = path.resolve(
      __dirname,
      "../../src/components/EntryDetailPage.astro",
    );
    const content = fs.readFileSync(shellPath, "utf8");
    expect(content).toContain('data-pagefind-weight="2.0"');
  });

  it("verifies that talent and feat detail pages render through the shell", () => {
    const detailFiles = [
      "[system]/[sphere]/[talent].astro",
      "[system]/feats/[category]/[feat].astro",
      "[system]/classes/[class]/traits/[trait].astro",
    ];
    for (const f of detailFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("EntryDetailPage");
    }
  });

  it('verifies that primary sphere and class pages retain weight="10"', () => {
    // The weight lives in the shared PageHeading component (default "10");
    // the primary pages must route their h1 through it.
    expect(fs.readFileSync(pageHeadingPath(), "utf8")).toContain(
      'weight = "10"',
    );
    const primaryFiles = [
      "[system]/[sphere]/index.astro",
      "[system]/classes/[class].astro",
    ];
    for (const f of primaryFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("<PageHeading");
    }
  });

  it("verifies that tag detail pages are ignored by pagefind", () => {
    const p = path.join(pagesDir, "tags/[tag].astro");
    const content = fs.readFileSync(p, "utf8");
    expect(content).toContain("pagefindIgnore={true}");
  });

  it("verifies that tag index page is ignored by pagefind", () => {
    const p = path.join(pagesDir, "tags/index.astro");
    const content = fs.readFileSync(p, "utf8");
    expect(content).toContain("pagefindIgnore={true}");
  });

  it("verifies that system index pages are ignored by pagefind", () => {
    const systemIndexFiles = ["[system]/index.astro"];
    for (const f of systemIndexFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("pagefindIgnore={true}");
    }
  });
});
