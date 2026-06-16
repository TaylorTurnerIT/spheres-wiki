import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Search Weight Verification", () => {
  const pagesDir = path.resolve(__dirname, "../../src/pages");

  it('verifies that talent pages have data-pagefind-weight="2.0"', () => {
    const talentFiles = ["[system]/[sphere]/[talent].astro"];
    for (const f of talentFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain('data-pagefind-weight="2.0"');
    }
  });

  it('verifies that feat pages have data-pagefind-weight="2.0"', () => {
    const featFiles = ["[system]/[sphere]/feats/[feat].astro"];
    for (const f of featFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain('data-pagefind-weight="2.0"');
    }
  });

  it('verifies that primary sphere and class pages retain weight="10"', () => {
    const primaryFiles = [
      "[system]/[sphere]/index.astro",
      "[system]/classes/[class].astro",
      "champions/[slug].astro",
    ];
    for (const f of primaryFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain('data-pagefind-weight="10"');
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
    const systemIndexFiles = ["[system]/index.astro", "champions/index.astro"];
    for (const f of systemIndexFiles) {
      const p = path.join(pagesDir, f);
      const content = fs.readFileSync(p, "utf8");
      expect(content).toContain("pagefindIgnore={true}");
    }
  });
});
