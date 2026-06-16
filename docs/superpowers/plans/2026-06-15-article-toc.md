# ArticleTOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken, depth-2/3-only heading TOC with a generalized N-level tree built from a shared `buildTocTree()`, fix the dead `{.toc-exclude}` opt-out flag, delete the unused `{.toc-include}` flag, rename `LocalToc` → `ArticleTOC`, and wire the TOC into both tabbed and plain article pages.

**Architecture:** A new pure function `buildTocTree()` in `src/lib/articleToc.ts` turns Astro's flat `headings` array into a nested `TocNode[]` tree using stack-based nesting (a heading nests under the nearest still-open ancestor with a shallower depth). `ArticleTOC.astro` (renamed from `LocalToc.astro`) renders that tree via a recursive `ArticleTocNode.astro` sub-component. `TabbedContent.astro` and `ArticlePage.astro` both consume `buildTocTree()` instead of duplicating heading-walking logic.

**Tech Stack:** Astro 6.x, TypeScript, `unist-util-visit` (remark plugin), Vitest.

Reference spec: `docs/superpowers/specs/2026-06-15-article-toc-design.md`

---

### Task 1: `buildTocTree()` pure function

**Files:**
- Create: `src/lib/articleToc.ts`
- Test: `tests/lib/articleToc.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/articleToc.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/articleToc.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/articleToc'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/articleToc.ts

/** Invisible marker `remarkStripTocFlags` substitutes for `{.toc-exclude}`.
 *  Survives into Astro's `headings` array (unlike plain stripping, which
 *  runs before Astro collects headings — see design doc root-cause finding)
 *  but renders as nothing on the page. */
export const EXCLUDE_SENTINEL = '​';

export interface TocNode {
  id: string;
  label: string;
  depth: number;
  children: TocNode[];
}

export interface RenderedHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * Turns Astro's flat `headings` array (from `render(entry)`) into a nested
 * tree. A heading becomes a child of the nearest still-open ancestor with a
 * strictly shallower depth; otherwise it starts a new root. This handles
 * non-monotonic depth jumps (h2 -> h5 directly, a later h2 sibling after a
 * deep h3 subtree, etc.) with no fixed level mapping.
 */
export function buildTocTree(headings: RenderedHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const h of headings) {
    if (h.text.includes(EXCLUDE_SENTINEL)) continue;

    const label = h.text.replaceAll(EXCLUDE_SENTINEL, '').trim();
    const node: TocNode = { id: h.slug, label, depth: h.depth, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= h.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/articleToc.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/articleToc.ts tests/lib/articleToc.test.ts
git commit -m "feat(toc): add buildTocTree shared N-level heading tree builder

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix the dead `{.toc-exclude}` flag in `remarkStripTocFlags`

**Files:**
- Modify: `src/lib/remarkStripTocFlags.ts`
- Test: `tests/lib/remarkStripTocFlags.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/remarkStripTocFlags.test.ts
import { describe, it, expect } from 'vitest';
import remarkStripTocFlags from '../../src/lib/remarkStripTocFlags';
import { EXCLUDE_SENTINEL } from '../../src/lib/articleToc';

function headingTree(text: string) {
  return {
    type: 'root',
    children: [
      { type: 'heading', depth: 2, children: [{ type: 'text', value: text }] },
    ],
  };
}

function headingText(tree: ReturnType<typeof headingTree>): string {
  return (tree.children[0] as any).children[0].value;
}

describe('remarkStripTocFlags', () => {
  it('replaces {.toc-exclude} with the zero-width sentinel instead of deleting it', () => {
    const tree = headingTree('{.toc-exclude} Hidden Section');
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe(`${EXCLUDE_SENTINEL}Hidden Section`);
  });

  it('leaves headings with no flag untouched', () => {
    const tree = headingTree('Plain Heading');
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe('Plain Heading');
  });

  it('no longer special-cases {.toc-include} (flag removed from the codebase)', () => {
    const tree = headingTree('{.toc-include} Some Heading');
    remarkStripTocFlags()(tree as any);
    expect(headingText(tree)).toBe('{.toc-include} Some Heading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/remarkStripTocFlags.test.ts`
Expected: FAIL — first test fails because the current code deletes the flag (`''`) instead of substituting the sentinel; third test fails because the current code also strips `{.toc-include}`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/remarkStripTocFlags.ts
import { visit } from 'unist-util-visit';
import { EXCLUDE_SENTINEL } from './articleToc';

export default function remarkStripTocFlags() {
  return (tree: any) => {
    visit(tree, 'heading', (node: any) => {
      visit(node, 'text', (textNode: any) => {
        textNode.value = textNode.value.replace(/\{\.toc-exclude\}\s*/g, EXCLUDE_SENTINEL);
      });
    });
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/remarkStripTocFlags.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/remarkStripTocFlags.ts tests/lib/remarkStripTocFlags.test.ts
git commit -m "fix(toc): make {.toc-exclude} survive Astro's heading collection

Astro builds the headings array via rehypeHeadingIds, which runs
after all user remarkPlugins. Stripping the flag to '' before that
point meant the old text-match check in TabbedContent could never
fire. Substitute an invisible zero-width sentinel instead so the
flag is detectable downstream while still rendering as nothing.

Drops {.toc-include} handling — never used for filtering, pure noise.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Strip `{.toc-include}` from content files

**Files:**
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/boons.md`
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/custom-traditions.md`
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/general-drawbacks.md`
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/rules.md`
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/sphere-drawbacks.md`
- Modify: `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/standard-traditions.md`

- [ ] **Step 1: Confirm every occurrence is followed by a space (safe to strip uniformly)**

Run:
```bash
cd src/content/ultimate-spheres-of-power/power/articles/casting-traditions
grep -rno '{\.toc-include}[^ ]' *.md
```
Expected: no output (already verified during design — every occurrence is `{.toc-include} ` with a trailing space before the heading text)

- [ ] **Step 2: Strip the flag**

Run:
```bash
cd src/content/ultimate-spheres-of-power/power/articles/casting-traditions
sed -i 's/{\.toc-include} //g' boons.md custom-traditions.md general-drawbacks.md rules.md sphere-drawbacks.md standard-traditions.md
```

- [ ] **Step 3: Verify zero occurrences remain and headings are intact**

Run:
```bash
cd src/content/ultimate-spheres-of-power/power/articles/casting-traditions
grep -rc "toc-include" *.md
grep -oE "^#{1,6} .*" custom-traditions.md | head -5
```
Expected: every file reports `0` for the grep count; the heading sample shows clean text like `## Custom Traditions` (no leftover flag).

- [ ] **Step 4: Commit**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
git add src/content/ultimate-spheres-of-power/power/articles/casting-traditions/
git commit -m "content: remove unused {.toc-include} flag from casting-traditions

Never used for filtering (the TOC is opt-out by default); pure
noise across 403 occurrences in 6 files.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Rename `LocalToc.astro` → `ArticleTOC.astro`, support N-level rendering

**Files:**
- Rename: `src/components/LocalToc.astro` → `src/components/ArticleTOC.astro`
- Create: `src/components/ArticleTocNode.astro`
- Modify: `src/styles/global.css`
- Test: `tests/lib/articleToc-wiring.test.ts`

- [ ] **Step 1: Write the failing regression test**

This codebase tests Astro components via file-content assertions (see `tests/lib/scrollspy.test.ts`) rather than DOM rendering. This new file accumulates one assertion block per remaining task.

```ts
// tests/lib/articleToc-wiring.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: FAIL — `LocalToc.astro` still exists, `ArticleTOC.astro` doesn't.

- [ ] **Step 3: Rename the file**

```bash
git mv src/components/LocalToc.astro src/components/ArticleTOC.astro
```

- [ ] **Step 4: Replace `ArticleTOC.astro`'s contents**

```astro
---
import ArticleTocNode from './ArticleTocNode.astro';
import type { TocNode } from '@/lib/articleToc';

interface Props {
  items: TocNode[];
  system?: string;
}

const { items, system = 'power' } = Astro.props;
---
<nav class="toc article-toc" aria-label="On this page" style={`--clr-system: var(--clr-${system})`}>
  <p class="toc-title">On This Page</p>
  <ul class="toc-list">
    {items.map(item => (
      <ArticleTocNode node={item} isTop rootDepth={item.depth} />
    ))}
  </ul>
</nav>

<script>
let activeObserver: IntersectionObserver | null = null;
let activeScrollHandler: (() => void) | null = null;

function initToc(nav: HTMLElement) {
  const getTargetElement = (id: string): HTMLElement | null => {
    try {
      return document.getElementById(id);
    } catch {
      return null;
    }
  };

  const categories = [...nav.querySelectorAll<HTMLElement>('[data-toc-section]')];
  const headings = categories
    .map(cat => ({
      cat,
      heading: getTargetElement(cat.dataset.tocSection!),
      subLinks: [...cat.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')],
    }))
    .filter((s): s is typeof s & { heading: HTMLElement } => s.heading !== null);

  function setActive(active: HTMLElement | null) {
    categories.forEach(cat => {
      const subList = cat.querySelector<HTMLElement>('.toc-sub-list');
      const inner = cat.querySelector<HTMLElement>('.toc-sub-inner');
      const isActive = cat === active;

      cat.classList.toggle('is-active', isActive);
      if (subList && inner) {
        subList.style.maxHeight = isActive ? inner.scrollHeight + 'px' : '0';
      }
    });
  }

  const allSubLinks = [...nav.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];

  function recalc() {
    let current: HTMLElement | null = headings[0]?.cat ?? null;
    for (const { cat, heading } of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.25) {
        current = cat;
      }
    }
    setActive(current);

    let activeSub: HTMLAnchorElement | null = null;
    for (const { subLinks } of headings) {
      for (const link of subLinks) {
        const el = getTargetElement(link.dataset.tocItem!);
        if (el && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().top <= window.innerHeight * 0.15) {
          activeSub = link;
        }
      }
    }
    allSubLinks.forEach(l => l.classList.toggle('is-current', l === activeSub));
  }

  activeObserver = new IntersectionObserver(recalc, {
    rootMargin: '-5% 0px -5% 0px',
    threshold: [0, 1],
  });
  headings.forEach(({ heading }) => activeObserver!.observe(heading));

  let rafPending = false;
  activeScrollHandler = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      recalc();
      rafPending = false;
    });
  };
  window.addEventListener('scroll', activeScrollHandler, { passive: true });
  recalc();
}

// Global function to be called by TabbedContent
(window as any).reinitArticleToc = () => {
  activeObserver?.disconnect();
  if (activeScrollHandler) window.removeEventListener('scroll', activeScrollHandler);

  const nav = document.querySelector<HTMLElement>('.article-toc');
  if (nav) initToc(nav);
};

document.addEventListener('astro:page-load', () => {
  const nav = document.querySelector<HTMLElement>('.article-toc');
  if (nav) initToc(nav);
});
</script>

<style>
  .article-toc {
    margin-bottom: 1.5rem;
    position: static;
    width: 100%;
  }
</style>
```

Note on `recalc()`/`subLinks`: this logic is **unchanged** from the old `LocalToc.astro` — it already generalizes correctly once the markup nests recursively, because `subLinks` is collected via `cat.querySelectorAll('[data-toc-item]')`, which finds every `[data-toc-item]` descendant regardless of nesting depth. Only the markup (Step 5) needs to change to put `data-toc-item` on every non-top node.

- [ ] **Step 5: Create `ArticleTocNode.astro`**

```astro
---
import ArticleTocNode from './ArticleTocNode.astro';
import type { TocNode } from '@/lib/articleToc';

interface Props {
  node: TocNode;
  isTop?: boolean;
  rootDepth: number;
}

const { node, isTop = false, rootDepth } = Astro.props;
const indentLevel = Math.min(node.depth - rootDepth, 3);
---
{isTop ? (
  <li class="toc-category" data-toc-section={node.id}>
    <a href={`#${node.id}`} class="toc-cat-link">
      <span>{node.label}</span>
    </a>
    {node.children.length > 0 && (
      <div class="toc-sub-list">
        <div class="toc-sub-inner">
          {node.children.map(child => (
            <ArticleTocNode node={child} rootDepth={rootDepth} />
          ))}
        </div>
      </div>
    )}
  </li>
) : (
  <>
    <a href={`#${node.id}`} data-toc-item={node.id} style={`--toc-depth: ${indentLevel}`}>{node.label}</a>
    {node.children.map(child => (
      <ArticleTocNode node={child} rootDepth={rootDepth} />
    ))}
  </>
)}
```

`rootDepth` is each top node's own `depth`, threaded unchanged through recursive calls, so indent is relative to where that particular category started (categories starting at `h2` vs. `h3` in different files both indent correctly relative to themselves). `indentLevel` is capped at 3 so an outlier depth-6 heading can't blow out the sidebar width.

- [ ] **Step 6: Update `global.css`**

Rename the stale comment (`src/styles/global.css:1479`):

```css
/* Re-allow components like .article-toc to use their own hover styles */
```

Add per-depth indent to the existing `.toc-sub-list a` rule:

```css
.toc-sub-list a {
  font-size: var(--fs-2xs);
  color: var(--clr-muted);
  text-decoration: none;
  line-height: 1.3;
  display: block;
  padding-left: calc((var(--toc-depth, 1) - 1) * 10px);
}
```

(Direct children get `--toc-depth: 1` → 0 extra indent beyond the container's existing `10px`; depth 2 adds `10px`; depth 3+ — capped — adds `20px`.)

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add -A src/components/ArticleTOC.astro src/components/ArticleTocNode.astro src/styles/global.css tests/lib/articleToc-wiring.test.ts
git status # confirm LocalToc.astro shows as deleted/renamed
git commit -m "feat(toc): rename LocalToc to ArticleTOC, render N-level trees

Splits the recursive node rendering into ArticleTocNode.astro
(self-importing for arbitrary depth). The existing scroll-highlight
JS needed no logic changes — it already walks descendants
generically once the markup nests data-toc-item recursively.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Wire `buildTocTree` into `TabbedContent.astro`

**Files:**
- Modify: `src/components/TabbedContent.astro`
- Test: `tests/lib/articleToc-wiring.test.ts`

- [ ] **Step 1: Add the failing assertion**

```ts
// append to describe('ArticleTOC rename', ...) in tests/lib/articleToc-wiring.test.ts
it('TabbedContent.astro uses the shared buildTocTree and ArticleTOC, not the old per-tab depth-2/3 loop', () => {
  const content = read('src/components/TabbedContent.astro');
  expect(content).toContain("import { buildTocTree");
  expect(content).toContain('<ArticleTOC');
  expect(content).not.toContain('LocalToc');
  expect(content).not.toContain("h.depth === 2");
  expect(content).not.toContain('reinitLocalToc');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: FAIL — `TabbedContent.astro` still imports `LocalToc` and uses the depth-2/3 loop.

- [ ] **Step 3: Update imports (`src/components/TabbedContent.astro:1-4`)**

Replace:
```astro
import { getEntry, render } from 'astro:content';
import LocalToc from '@/components/LocalToc.astro';
import type { TocItem } from '@/components/LocalToc.astro';
```
with:
```astro
import { getEntry, render } from 'astro:content';
import ArticleTOC from '@/components/ArticleTOC.astro';
import { buildTocTree, type TocNode } from '@/lib/articleToc';
```

- [ ] **Step 4: Replace the per-tab TOC-building loop (`src/components/TabbedContent.astro:24-58`)**

Replace:
```ts
const renderedTabs = await Promise.all(
  tabs.map(async (tab) => {
    let Content = null;
    let tocItems: TocItem[] = [];

    if (tab.articleId && tab.collection) {
      const entry = await getEntry(tab.collection as any, tab.articleId);
      if (entry) {
        const { Content: RenderedContent, headings } = await render(entry);
        Content = RenderedContent;

        if (tab.showToc) {
          let currentCat: TocItem | null = null;
          for (const h of headings) {
            if (h.text.includes('{.toc-exclude}')) continue;

            const label = h.text
              .replace('{.toc-include}', '')
              .replace('{.toc-exclude}', '')
              .trim();

            if (h.depth === 2) {
              currentCat = { id: h.slug, label, sub: [] };
              tocItems.push(currentCat);
            } else if (h.depth === 3 && currentCat) {
              currentCat.sub?.push({ id: h.slug, label });
            }
          }
        }
      }
    }
    return { slug: tab.slug, Content, tocItems };
  })
);
```
with:
```ts
const renderedTabs = await Promise.all(
  tabs.map(async (tab) => {
    let Content = null;
    let tocItems: TocNode[] = [];

    if (tab.articleId && tab.collection) {
      const entry = await getEntry(tab.collection as any, tab.articleId);
      if (entry) {
        const { Content: RenderedContent, headings } = await render(entry);
        Content = RenderedContent;

        if (tab.showToc) {
          tocItems = buildTocTree(headings);
        }
      }
    }
    return { slug: tab.slug, Content, tocItems };
  })
);
```

- [ ] **Step 5: Update the template render (`src/components/TabbedContent.astro` template block)**

Replace:
```astro
          <template data-toc-template={tab.slug}>
             {tocItems.length > 0 && <LocalToc items={tocItems} system={system} />}
          </template>
```
with:
```astro
          <template data-toc-template={tab.slug}>
             {tocItems.length > 0 && <ArticleTOC items={tocItems} system={system} />}
          </template>
```

- [ ] **Step 6: Update the tab-switch script**

Replace:
```ts
      if (sidebar) {
        const oldToc = sidebar.querySelector('.local-toc');
        if (oldToc) oldToc.remove();

        const template = container.querySelector(`template[data-toc-template="${slug}"]`) as HTMLTemplateElement;
        if (template) {
           const clone = template.content.cloneNode(true);
           sidebar.prepend(clone);
           // Re-init TOC highlight logic
           if ((window as any).reinitLocalToc) {
             (window as any).reinitLocalToc();
           }
        }
      }
```
with:
```ts
      if (sidebar) {
        const oldToc = sidebar.querySelector('.article-toc');
        if (oldToc) oldToc.remove();

        const template = container.querySelector(`template[data-toc-template="${slug}"]`) as HTMLTemplateElement;
        if (template) {
           const clone = template.content.cloneNode(true);
           sidebar.prepend(clone);
           // Re-init TOC highlight logic
           if ((window as any).reinitArticleToc) {
             (window as any).reinitArticleToc();
           }
        }
      }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 8: Commit**

```bash
git add src/components/TabbedContent.astro tests/lib/articleToc-wiring.test.ts
git commit -m "refactor(toc): TabbedContent uses shared buildTocTree + ArticleTOC

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Wire `ArticleTOC` into `ArticlePage.astro`

**Files:**
- Modify: `src/layouts/ArticlePage.astro`
- Test: `tests/lib/articleToc-wiring.test.ts`

- [ ] **Step 1: Add the failing assertion**

```ts
// append to tests/lib/articleToc-wiring.test.ts
it('ArticlePage.astro accepts headings/showToc props and auto-renders ArticleTOC into the sidebar', () => {
  const content = read('src/layouts/ArticlePage.astro');
  expect(content).toContain('headings?: RenderedHeading[]');
  expect(content).toContain('showToc?: boolean');
  expect(content).toContain('buildTocTree');
  expect(content).toContain('<ArticleTOC');
  expect(content).toContain("tocItems.length >= 2");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: FAIL — none of these exist in `ArticlePage.astro` yet.

- [ ] **Step 3: Update the frontmatter (`src/layouts/ArticlePage.astro:1-18`)**

Replace:
```astro
---
import { url } from "@/lib/url";
import WikiPage from "@/layouts/WikiPage.astro";
import BookCard from "@/components/BookCard.astro";
import { SYSTEMS } from "@/config/site";
import type { ArticleEntry, BookMeta } from "@/lib/types";

interface Props {
  article: ArticleEntry;
  book?: BookMeta;
  description?: string;
}

const { article, book, description } = Astro.props;

// Determine system for color-coding
const sys = article.system || 'power';
const sysLabel = SYSTEMS[sys as keyof typeof SYSTEMS]?.label || 'Power';
---
```
with:
```astro
---
import { url } from "@/lib/url";
import WikiPage from "@/layouts/WikiPage.astro";
import BookCard from "@/components/BookCard.astro";
import ArticleTOC from "@/components/ArticleTOC.astro";
import { buildTocTree, type RenderedHeading } from "@/lib/articleToc";
import { SYSTEMS } from "@/config/site";
import type { ArticleEntry, BookMeta } from "@/lib/types";

interface Props {
  article: ArticleEntry;
  book?: BookMeta;
  description?: string;
  headings?: RenderedHeading[];
  showToc?: boolean;
}

const { article, book, description, headings = [], showToc = true } = Astro.props;

// Determine system for color-coding
const sys = article.system || 'power';
const sysLabel = SYSTEMS[sys as keyof typeof SYSTEMS]?.label || 'Power';

const tocItems = showToc ? buildTocTree(headings) : [];
---
```

- [ ] **Step 4: Update the sidebar markup**

Replace:
```astro
      {(book || Astro.slots.has('sidebar')) && (
        <aside class="article-sidebar" id="article-sidebar">
          <slot name="sidebar" />
          {book && <BookCard book={book} />}
        </aside>
      )}
```
with:
```astro
      {(book || Astro.slots.has('sidebar') || tocItems.length >= 2) && (
        <aside class="article-sidebar" id="article-sidebar">
          {tocItems.length >= 2 && <ArticleTOC items={tocItems} system={sys} />}
          <slot name="sidebar" />
          {book && <BookCard book={book} />}
        </aside>
      )}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/layouts/ArticlePage.astro tests/lib/articleToc-wiring.test.ts
git commit -m "feat(toc): ArticlePage auto-renders a sidebar TOC from headings

New headings/showToc props; sidebar appears whenever there are >=2
toc-eligible headings, a book, or a sidebar slot. showToc=false is
an escape hatch for pages that don't want a TOC regardless of
heading count.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Pass `headings` through from the 6 non-tab article pages

**Files:**
- Modify: `src/pages/about/index.astro`
- Modify: `src/pages/legal/index.astro`
- Modify: `src/pages/privacy/index.astro`
- Modify: `src/pages/community-resources/index.astro`
- Modify: `src/pages/power/using-spheres-of-power/index.astro`
- Modify: `src/pages/power/how-to-build-spherecaster/index.astro`
- Test: `tests/lib/articleToc-wiring.test.ts`

- [ ] **Step 1: Add the failing assertion**

```ts
// append to tests/lib/articleToc-wiring.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: FAIL — all 6 pages currently destructure only `{ Content }` and don't pass `headings`.

- [ ] **Step 3: Update each page**

Each of the 6 files has the identical two-line change. In each file, replace:
```astro
const { Content } = await render(entry);
```
with:
```astro
const { Content, headings } = await render(entry);
```
and replace:
```astro
<ArticlePage article={article} book={book} description={description}>
```
with:
```astro
<ArticlePage article={article} book={book} description={description} headings={headings}>
```

Apply this to:
- `src/pages/about/index.astro`
- `src/pages/legal/index.astro`
- `src/pages/privacy/index.astro`
- `src/pages/community-resources/index.astro`
- `src/pages/power/using-spheres-of-power/index.astro`
- `src/pages/power/how-to-build-spherecaster/index.astro`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/articleToc-wiring.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/about/index.astro src/pages/legal/index.astro src/pages/privacy/index.astro src/pages/community-resources/index.astro src/pages/power/using-spheres-of-power/index.astro src/pages/power/how-to-build-spherecaster/index.astro tests/lib/articleToc-wiring.test.ts
git commit -m "feat(toc): wire ArticleTOC into the 6 non-tab article pages

casting-traditions/index.astro is unaffected — it doesn't pass
headings to its outer ArticlePage, so the outer page gets no TOC
(each tab manages its own via TabbedContent).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: all tests pass, including the new `articleToc.test.ts`, `remarkStripTocFlags.test.ts`, and `articleToc-wiring.test.ts` (19 new tests total)

- [ ] **Step 2: Type-check**

Run: `npx astro check`
Expected: no errors (confirms `TocNode`/`RenderedHeading` prop types line up across `ArticleTOC.astro`, `ArticleTocNode.astro`, `TabbedContent.astro`, `ArticlePage.astro`)

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: `validate.mjs` passes, Astro build succeeds, Pagefind indexes — confirms no remaining `LocalToc` references anywhere and the `casting-traditions` tabs (which exercise the deepest real nesting in content) render without errors

- [ ] **Step 4: Spot-check the casting-traditions page in a dev server**

Run: `npm run dev`, visit `http://localhost:4321/spheres-wiki/power/casting-traditions/#custom`
Expected: sidebar TOC shows "Custom Traditions" and "Card Casting Traditions" as top-level entries, each expandable to reveal every individual tradition (e.g. "Addled", "Akashic Tech") nested underneath, with "Divine Crusader"/"Inquisitor" indented one step further under "Divine Petitioner". Scrolling highlights the active tradition entry, not just the top-level category.

- [ ] **Step 5: No commit needed for this task** (verification only — if any of the above surfaces a problem, fix it in the relevant earlier task's files and amend that task's commit before moving on)

---

## Self-Review Notes

- **Spec coverage:** root-cause sentinel fix (Task 2), N-level stack nesting (Task 1), rename (Task 4), shared builder consumed by both `TabbedContent` (Task 5) and `ArticlePage` (Task 6), non-tab page wiring (Task 7), `.toc-include` removal from both code (Task 2) and content (Task 3) — all spec sections covered.
- **Type consistency checked:** `TocNode`/`RenderedHeading`/`buildTocTree`/`EXCLUDE_SENTINEL` names match exactly across `articleToc.ts`, `remarkStripTocFlags.ts`, `ArticleTOC.astro`, `ArticleTocNode.astro`, `TabbedContent.astro`, and `ArticlePage.astro` in every task.
- **No placeholders:** every step shows complete, exact code/diffs and exact file paths.
