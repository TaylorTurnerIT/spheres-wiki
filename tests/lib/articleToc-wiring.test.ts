import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../');
const read = (p: string) => fs.readFileSync(path.join(rootDir, p), 'utf8');

describe('ArticleTOC rename', () => {
  it('LocalToc.astro no longer exists', () => {
    expect(fs.existsSync(path.join(rootDir, 'src/components/LocalToc.astro'))).toBe(false);
  });

  it('ArticleTOC.astro exists, uses the .article-toc class, and exposes reinitArticleToc', () => {
    const content = read('src/components/ArticleTOC.astro');
    expect(content).toContain('article-toc');
    expect(content).toContain('reinitArticleToc');
    expect(content).not.toContain('local-toc');
    expect(content).not.toContain('reinitLocalToc');
  });

  it('ArticleTocNode.astro recursively imports itself to render nested children', () => {
    const content = read('src/components/ArticleTocNode.astro');
    expect(content).toContain("import ArticleTocNode from './ArticleTocNode.astro'");
  });

  it('global.css no longer references .local-toc', () => {
    const content = read('src/styles/global.css');
    expect(content).not.toContain('.local-toc');
  });

  it('TabbedContent.astro uses the shared buildTocTree and ArticleTOC, not the old per-tab depth-2/3 loop', () => {
    const content = read('src/components/TabbedContent.astro');
    expect(content).toContain("import { buildTocTree");
    expect(content).toContain('<ArticleTOC');
    expect(content).not.toContain('LocalToc');
    expect(content).not.toContain("h.depth === 2");
    expect(content).not.toContain('reinitLocalToc');
  });

  it('ArticlePage.astro accepts headings/showToc props and auto-renders ArticleTOC into the sidebar', () => {
    const content = read('src/layouts/ArticlePage.astro');
    expect(content).toContain('headings?: RenderedHeading[]');
    expect(content).toContain('showToc?: boolean');
    expect(content).toContain('buildTocTree');
    expect(content).toContain('<ArticleTOC');
    expect(content).toContain("tocItems.length >= 2");
  });

  it('all 6 non-tab article pages pass headings through to ArticlePage', () => {
    const pages = [
      'src/pages/about/index.astro',
      'src/pages/legal/index.astro',
      'src/pages/privacy/index.astro',
      'src/pages/community-resources/index.astro',
      'src/pages/power/using-spheres-of-power/index.astro',
      'src/pages/power/how-to-build-spherecaster/index.astro',
    ];
    for (const page of pages) {
      const content = read(page);
      expect(content).toContain('const { Content, headings } = await render(entry);');
      expect(content).toContain('headings={headings}');
    }
  });
});
