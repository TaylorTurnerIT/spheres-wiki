import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("/feats/ browse page", () => {
  const pageFile = path.resolve(__dirname, "../../src/pages/feats/index.astro");
  const content = fs.readFileSync(pageFile, "utf8");

  it("does not use the retired tabbed feat panel component", () => {
    expect(content).not.toContain("FeatsTabbedContent");
  });

  const componentFile = path.resolve(__dirname, "../../src/components/FeatsTabbedContent.astro");
  it("the tabbed feat panel component file no longer exists", () => {
    expect(fs.existsSync(componentFile)).toBe(false);
  });

  it("does not declare tab/tabpanel ARIA roles for feats", () => {
    expect(content).not.toMatch(/role=["']tablist["']/);
    expect(content).not.toMatch(/role=["']tabpanel["']/);
  });

  it("is excluded from Pagefind indexing — it's a browse UI, not prose", () => {
    expect(content).toContain("pagefindIgnore={true}");
  });

  it("renders a real table and does not render feat bodies server-side", () => {
    expect(content).toContain('class="feats-table"');
    expect(content).not.toContain("render(collEntry)");
    expect(content).not.toContain("astro:content");
  });

  it("uses the canonical getFeatUrl-derived href, not a hardcoded legacy path", () => {
    expect(content).toContain("buildFeatBrowseEntry");
    expect(content).not.toMatch(/\/feats-legacy\//);
  });

  it("search input appears before the filter row in document order", () => {
    const searchIdx = content.indexOf('id="feats-search-input"');
    const filterIdx = content.indexOf('class="feats-filter-row"');
    expect(searchIdx).toBeGreaterThan(-1);
    expect(filterIdx).toBeGreaterThan(-1);
    expect(searchIdx).toBeLessThan(filterIdx);
  });
});
