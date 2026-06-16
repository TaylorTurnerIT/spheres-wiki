import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("TOC Scrollspy & Collapsible Section Verification", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const tocPath = path.join(rootDir, "src/components/TableOfContents.astro");
  const archetypeSwapperPath = path.join(
    rootDir,
    "src/components/ArchetypeSwapper.astro",
  );
  const spherePath = path.join(
    rootDir,
    "src/pages/[system]/[sphere]/index.astro",
  );

  it("verifies TableOfContents.astro queries both data-feature-id and data-cat-id", () => {
    const content = fs.readFileSync(tocPath, "utf8");
    expect(content).toContain(
      `[data-feature-id="\${cat.dataset.tocSection}"], [data-cat-id="\${cat.dataset.tocSection}"]`,
    );
  });

  it("verifies that ArchetypeSwapper.astro dispatches class-feature-collapse event", () => {
    const content = fs.readFileSync(archetypeSwapperPath, "utf8");
    expect(content).toContain("class-feature-collapse");
    expect(content).toContain(
      "detail: { id: featureId, collapsed: willCollapse }",
    );
  });

  it("verifies that [system]/[sphere]/index.astro dispatches class-feature-collapse event", () => {
    const content = fs.readFileSync(spherePath, "utf8");
    expect(content).toContain("class-feature-collapse");
    expect(content).toContain("detail: { id: catId, collapsed: willCollapse }");
  });
});
