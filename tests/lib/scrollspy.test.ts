import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TOC Scrollspy & Collapsible Section Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const tocPath = path.join(rootDir, 'src/components/TableOfContents.astro');
  const classPath = path.join(rootDir, 'src/pages/power/classes/[class].astro');
  const spherePath = path.join(rootDir, 'src/pages/power/[sphere]/index.astro');

  it('verifies TableOfContents.astro queries both data-feature-id and data-cat-id', () => {
    const content = fs.readFileSync(tocPath, 'utf8');
    expect(content).toContain('[data-feature-id="${cat.dataset.tocSection}"], [data-cat-id="${cat.dataset.tocSection}"]');
  });

  it('verifies that power/classes/[class].astro dispatches class-feature-collapse event', () => {
    const content = fs.readFileSync(classPath, 'utf8');
    expect(content).toContain("class-feature-collapse");
    expect(content).toContain("detail: { id: featureId, collapsed: willCollapse }");
  });

  it('verifies that power/[sphere]/index.astro dispatches class-feature-collapse event', () => {
    const content = fs.readFileSync(spherePath, 'utf8');
    expect(content).toContain("class-feature-collapse");
    expect(content).toContain("detail: { id: catId, collapsed: willCollapse }");
  });
});
