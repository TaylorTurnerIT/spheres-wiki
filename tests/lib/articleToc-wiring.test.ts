import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "../../");
const read = (p: string) => fs.readFileSync(path.join(rootDir, p), "utf8");

describe("ArticleTOC rename", () => {
  it("LocalToc.astro no longer exists", () => {
    expect(
      fs.existsSync(path.join(rootDir, "src/components/LocalToc.astro")),
    ).toBe(false);
  });

  it("ArticleTOC.astro exists and uses the .article-toc class", () => {
    const content = read("src/components/ArticleTOC.astro");
    expect(content).toContain("article-toc");
    expect(content).not.toContain("local-toc");
  });

  it("articleTocClient.ts exposes reinitArticleToc", () => {
    const content = read("src/lib/articleTocClient.ts");
    expect(content).toContain("reinitArticleToc");
    expect(content).not.toContain("reinitLocalToc");
  });

  it("ArticleTocNode.astro recursively imports itself to render nested children", () => {
    const content = read("src/components/ArticleTocNode.astro");
    expect(content).toContain(
      "import ArticleTocNode from './ArticleTocNode.astro'",
    );
  });

  it("global.css no longer references .local-toc", () => {
    const content = read("src/styles/global.css");
    expect(content).not.toContain(".local-toc");
  });

  it("TabbedContent.astro uses the shared buildTocTree and ArticleTOC, not the old per-tab depth-2/3 loop", () => {
    const content = read("src/components/TabbedContent.astro");
    expect(content).toContain("import { buildTocTree");
    expect(content).toContain("<ArticleTOC");
    expect(content).not.toContain("LocalToc");
    expect(content).not.toContain("h.depth === 2");
    expect(content).not.toContain("reinitLocalToc");
  });

  it("ArticlePage.astro accepts headings/showToc props and auto-renders ArticleTOC into the sidebar", () => {
    const content = read("src/layouts/ArticlePage.astro");
    expect(content).toContain("headings?: RenderedHeading[]");
    expect(content).toContain("showToc?: boolean");
    expect(content).toContain("buildTocTree");
    expect(content).toContain("<ArticleTOC");
    expect(content).toContain("tocItems.length >= 2");
  });

  it("BuiltInArticlePage renders articles with headings passed through to ArticlePage", () => {
    const content = read("src/components/BuiltInArticlePage.astro");
    expect(content).toContain(
      "const { Content, headings } = await render(entry);",
    );
    expect(content).toContain("headings={headings}");
    expect(content).toContain("<ArticlePage");
  });

  it("all 6 non-tab article pages use the shared built-in article helper", () => {
    const pages = [
      "src/pages/about/index.astro",
      "src/pages/legal/index.astro",
      "src/pages/privacy/index.astro",
      "src/pages/community-resources/index.astro",
      "src/pages/power/using-spheres-of-power/index.astro",
      "src/pages/power/how-to-build-spherecaster/index.astro",
    ];
    for (const page of pages) {
      const content = read(page);
      expect(content).toContain("BuiltInArticlePage");
      expect(content).not.toContain("await getCollection(");
      expect(content).not.toContain("await render(entry)");
    }
  });
});
