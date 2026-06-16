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
});
