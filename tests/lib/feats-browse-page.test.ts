import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/pages/feats/index.astro"),
  "utf8",
);
const componentSource = fs.readFileSync(
  path.resolve(__dirname, "../../src/components/FeatsBrowse.astro"),
  "utf8",
);

describe("/feats/ catalog page", () => {
  it("no longer renders the tabbed feat panel component", () => {
    expect(pageSource).not.toMatch(/FeatsTabbedContent/);
    expect(
      fs.existsSync(path.resolve(__dirname, "../../src/components/FeatsTabbedContent.astro")),
    ).toBe(false);
  });

  it("does not render() full feat bodies into the page", () => {
    expect(pageSource).not.toMatch(/await render\(/);
    expect(pageSource).not.toMatch(/\bContent\s*\/>/);
  });

  it("is excluded from the Pagefind index (it is a navigation surface, not content)", () => {
    expect(pageSource).toMatch(/pagefindIgnore=\{true\}/);
  });

  it("builds its manifest through the shared feat-browse data model", () => {
    expect(pageSource).toMatch(/buildFeatBrowseRows/);
  });

  it("passes rows to a single browse component rather than a tab set", () => {
    expect(pageSource).toMatch(/<FeatsBrowse\b/);
    expect(pageSource).not.toMatch(/role="tablist"/);
  });
});

describe("FeatsBrowse browse component", () => {
  it("has no ARIA tablist/tab/tabpanel semantics (it is a filter bar, not a tab set)", () => {
    expect(componentSource).not.toMatch(/role="tab(list|panel)?"/);
  });

  it("routes every internal link through the url() helper — no hardcoded legacy paths", () => {
    const hardcodedHrefs = [...componentSource.matchAll(/href="(\/[^"{]*)"/g)].map((m) => m[1]);
    expect(hardcodedHrefs).toEqual([]);
  });

  it("renders canonical detail links from row.href, not a constructed/legacy path", () => {
    expect(componentSource).toMatch(/row\.href/);
  });

  it("keeps hover prefetch conditional on a modest result count, not unconditional", () => {
    expect(componentSource).toMatch(/PREFETCH_THRESHOLD/);
    expect(componentSource).not.toMatch(/data-astro-prefetch="hover"[^$]*$/m);
  });

  it("reflects search query, system, and category in the URL", () => {
    expect(componentSource).toMatch(/p\.set\("q", query\)/);
    expect(componentSource).toMatch(/p\.set\("system", activeSystem\)/);
    expect(componentSource).toMatch(/p\.set\("category", activeCategory\)/);
    expect(componentSource).toMatch(/getParams\(\)/);
  });

  it("paginates rather than rendering the entire manifest into the DOM at once", () => {
    expect(componentSource).toMatch(/PAGE_SIZE/);
    expect(componentSource).toMatch(/IntersectionObserver/);
  });
});
