import { describe, it, expect } from 'vitest';
import { buildTocTree, EXCLUDE_SENTINEL } from '../../src/lib/articleToc';

describe('buildTocTree', () => {
  it('returns an empty array for no headings', () => {
    expect(buildTocTree([])).toEqual([]);
  });

  it('builds a flat list when all headings share one depth', () => {
    const headings = [
      { depth: 2, slug: 'a', text: 'A' },
      { depth: 2, slug: 'b', text: 'B' },
    ];
    expect(buildTocTree(headings)).toEqual([
      { id: 'a', label: 'A', depth: 2, children: [] },
      { id: 'b', label: 'B', depth: 2, children: [] },
    ]);
  });

  it('nests a deeper heading under the nearest shallower ancestor', () => {
    const headings = [
      { depth: 2, slug: 'cat', text: 'Cat' },
      { depth: 3, slug: 'sub', text: 'Sub' },
    ];
    expect(buildTocTree(headings)).toEqual([
      {
        id: 'cat', label: 'Cat', depth: 2,
        children: [{ id: 'sub', label: 'Sub', depth: 3, children: [] }],
      },
    ]);
  });

  it('nests across a depth jump (h2 -> h5) with no intermediate levels', () => {
    const headings = [
      { depth: 2, slug: 'cat', text: 'Cat' },
      { depth: 5, slug: 'entry', text: 'Entry' },
    ];
    expect(buildTocTree(headings)).toEqual([
      {
        id: 'cat', label: 'Cat', depth: 2,
        children: [{ id: 'entry', label: 'Entry', depth: 5, children: [] }],
      },
    ]);
  });

  it('nests a sub-entry under its entry, then pops back to a sibling entry at the same depth', () => {
    const headings = [
      { depth: 2, slug: 'cat', text: 'Cat' },
      { depth: 5, slug: 'entry-1', text: 'Entry 1' },
      { depth: 6, slug: 'entry-1-sub', text: 'Entry 1 Sub' },
      { depth: 5, slug: 'entry-2', text: 'Entry 2' },
    ];
    const tree = buildTocTree(headings);
    expect(tree[0].children).toEqual([
      {
        id: 'entry-1', label: 'Entry 1', depth: 5,
        children: [{ id: 'entry-1-sub', label: 'Entry 1 Sub', depth: 6, children: [] }],
      },
      { id: 'entry-2', label: 'Entry 2', depth: 5, children: [] },
    ]);
  });

  it('starts a new root sibling when depth decreases below all open ancestors', () => {
    const headings = [
      { depth: 3, slug: 'top', text: 'Top' },
      { depth: 4, slug: 'mid', text: 'Mid' },
      { depth: 5, slug: 'leaf', text: 'Leaf' },
      { depth: 2, slug: 'new-root', text: 'New Root' },
    ];
    const tree = buildTocTree(headings);
    expect(tree.map(n => n.id)).toEqual(['top', 'new-root']);
    expect(tree[0].children[0].children[0].id).toBe('leaf');
  });

  it('skips a heading flagged with the exclude sentinel', () => {
    const headings = [
      { depth: 2, slug: 'kept', text: 'Kept' },
      { depth: 2, slug: 'skipped', text: `${EXCLUDE_SENTINEL}Skipped` },
    ];
    expect(buildTocTree(headings)).toEqual([
      { id: 'kept', label: 'Kept', depth: 2, children: [] },
    ]);
  });

  it('does not let an excluded heading break nesting for headings after it', () => {
    const headings = [
      { depth: 2, slug: 'cat', text: 'Cat' },
      { depth: 3, slug: 'excluded-sub', text: `${EXCLUDE_SENTINEL}Excluded` },
      { depth: 3, slug: 'kept-sub', text: 'Kept Sub' },
    ];
    const tree = buildTocTree(headings);
    expect(tree[0].children).toEqual([
      { id: 'kept-sub', label: 'Kept Sub', depth: 3, children: [] },
    ]);
  });
});
