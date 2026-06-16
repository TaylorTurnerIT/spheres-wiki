# Article TOC: generalized heading-driven TOC + LocalToc → ArticleTOC rename

**Date:** 2026-06-15
**Scope:** `LocalToc.astro` (renamed `ArticleTOC.astro`), `TabbedContent.astro`, `ArticlePage.astro`, `remarkStripTocFlags.ts`, new `src/lib/articleToc.ts`, 6 content files, 6 non-tab article pages

## Goal

Tabbed-layout articles and plain single articles both render markdown headings. Every heading should appear in the sidebar TOC by default; authors can opt a heading out with `{.toc-exclude}`. Scroll position highlights the active section using the system color, same visual language as the existing sphere-page TOC. Rename `LocalToc` → `ArticleTOC` throughout.

## Root-cause finding

The opt-out flag has never worked. Astro builds the `headings` array via its internal `rehypeHeadingIds`, which runs *after* all user `remarkPlugins` (`astro.config.mjs:29-32`). `remarkStripTocFlags` strips `{.toc-exclude}` from heading text before Astro collects `headings`, so `h.text.includes('{.toc-exclude}')` in the old `TabbedContent.astro` logic checks already-stripped text — it can never match. There is no supported Astro config hook that runs after heading collection but before final HTML stringification, so we can't simply move the strip later.

Separately, the old logic only ever read `h.depth === 2` (category) and `h.depth === 3` (sub), so real content nesting at depth 5/6 (e.g. `casting-traditions/custom-traditions.md`, which has ~70 `{.toc-include}`-tagged entries at depth 5/6) never reached the TOC regardless of the exclude bug.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Exclude detection | Replace `{.toc-exclude}` with a zero-width sentinel (`​`), not empty string, in `remarkStripTocFlags` | Invisible on the rendered page, but survives into `h.text` so component code can still detect it after Astro's heading collection runs |
| `{.toc-include}` flag | Delete entirely — from the remark plugin and from all 6 content files (403 occurrences) | Never used for filtering (opt-out-by-default makes it redundant); pure noise |
| Heading nesting | Stack-based tree: a heading becomes a child of the nearest still-open ancestor with strictly shallower depth, else a sibling | Content jumps depths non-monotonically (`h2→h3→h5→h6`, `h2→h5` direct, a later `h2` sibling after a deep `h3` subtree) — stack nesting handles all of it with no fixed level mapping |
| Visual indent | Per-depth indent step, capped at 3 steps (depth 4+ reuses step 3's indent) | Real content nests up to ~4 levels deep; cap avoids runaway sidebar width on outliers |
| Collapse/expand | Only depth-0 nodes collapse/expand (unchanged from today's category mechanic) — the whole nested subtree lives inside that single collapsible wrapper | Simpler interaction model; avoids N independent collapse toggles for marginal benefit |
| Active highlight | Two-pass scan unchanged in shape: depth-0 nodes use the 25%-viewport "active category" pass; **every** non-top node (any depth, not just depth-3) uses the existing 15%-viewport "current" pass | Generalizes for free — no new algorithm, just a wider selector |
| Shared logic | New `src/lib/articleToc.ts` exports `buildTocTree(headings)`, used by both `TabbedContent.astro` (per-tab) and `ArticlePage.astro` (whole-page) | Avoids duplicating the stack algorithm in two components |
| Non-tab articles | `ArticlePage.astro` gets `headings?` and `showToc? = true` props; auto-builds + renders `ArticleTOC` into the sidebar when the tree has ≥2 items | One change point instead of editing every article page's markup individually; pages just pass `headings` through from `render(entry)` |
| Per-page opt-out | `showToc={false}` on `ArticlePage` skips TOC entirely regardless of heading count | Escape hatch for pages that technically have ≥2 headings but don't want a TOC |

## Architecture

### `src/lib/articleToc.ts` (new)

```ts
export interface TocNode {
  id: string;
  label: string;
  depth: number;
  children: TocNode[];
}

interface RenderedHeading {
  depth: number;
  slug: string;
  text: string;
}

const EXCLUDE_SENTINEL = '​';

export function buildTocTree(headings: RenderedHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = []; // ancestor stack, increasing depth

  for (const h of headings) {
    if (h.text.includes(EXCLUDE_SENTINEL)) continue;
    const label = h.text.replace(new RegExp(EXCLUDE_SENTINEL, 'g'), '').trim();

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

### `remarkStripTocFlags.ts`

```ts
import { visit } from 'unist-util-visit';

const EXCLUDE_SENTINEL = '​';

export default function remarkStripTocFlags() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      visit(node, 'text', (textNode) => {
        textNode.value = textNode.value.replace(/\{\.toc-exclude\}\s*/g, EXCLUDE_SENTINEL);
      });
    });
  };
}
```

`.toc-include` handling removed entirely (was dead — never used for filtering, only ever stripped for display).

### Content files

Strip literal `{.toc-include} ` (flag + trailing space) from all 6 files under `src/content/ultimate-spheres-of-power/power/articles/casting-traditions/`: `boons.md`, `custom-traditions.md`, `general-drawbacks.md`, `rules.md`, `sphere-drawbacks.md`, `standard-traditions.md`. Mechanical text removal, no semantic change — 403 occurrences total.

### `ArticleTOC.astro` (renamed from `LocalToc.astro`)

```ts
export interface TocNode {
  id: string;
  label: string;
  depth: number;
  children: TocNode[];
}

interface Props {
  items: TocNode[];
  system?: string;
}
```

Renders recursively (self-import) into nested `<ul>`/`<li>`:

```html
<nav class="article-toc" aria-label="On this page" style="--clr-system: var(--clr-{system})">
  <p class="toc-title">On This Page</p>
  <ul class="toc-list">
    {items.map(node => <ArticleTocNode node={node} isTop />)}
  </ul>
</nav>
```

Each node renders `data-toc-node`, `data-toc-top` (only depth-0), and `style="--toc-depth: {Math.min(node.depth - rootDepth, 3)}"` for indent. Depth-0 nodes get the existing `.toc-cat-link` styling + collapsible `.toc-sub-list`/`.toc-sub-inner` wrapper (now containing the *entire* nested subtree, not just one flat level). Non-top nodes render as plain indented links inside that wrapper, always visible once the ancestor expands.

Renamed identifiers:
- `.local-toc` → `.article-toc`
- `window.reinitLocalToc` → `window.reinitArticleToc`
- Exported type `TocItem` → `TocNode` (now recursive, `sub` replaced by `children`)

### JS (in `ArticleTOC.astro`)

Same shape as today's `recalc()`/`IntersectionObserver` logic, generalized:
- `categories` = `[data-toc-top]` nodes (was: all `[data-toc-section]`, already top-level — no change needed here)
- `allSubLinks` = `[data-toc-node]:not([data-toc-top])` (was: `[data-toc-item]` scoped to direct children only) — now matches every non-top node at any depth
- 25%-viewport pass picks the active category exactly as before
- 15%-viewport pass picks the current node from the now-wider `allSubLinks` set exactly as before

### `TabbedContent.astro`

Replace the inline depth-2/3 loop (lines ~36-53) with:

```ts
import { buildTocTree } from '@/lib/articleToc';
import ArticleTOC from '@/components/ArticleTOC.astro';
// ...
if (tab.showToc) {
  tocItems = buildTocTree(headings);
}
```

`<LocalToc items={tocItems} system={system} />` → `<ArticleTOC items={tocItems} system={system} />`. The `template[data-toc-template]` / sidebar-swap / `reinitArticleToc()` mechanism is unchanged structurally, just renamed.

### `ArticlePage.astro`

```ts
import { buildTocTree, type TocNode } from '@/lib/articleToc';
import ArticleTOC from '@/components/ArticleTOC.astro';

interface Props {
  article: ArticleEntry;
  book?: BookMeta;
  description?: string;
  headings?: { depth: number; slug: string; text: string }[];
  showToc?: boolean;
}

const { article, book, description, headings = [], showToc = true } = Astro.props;
const tocItems: TocNode[] = showToc ? buildTocTree(headings) : [];
```

Sidebar gate widens from `(book || Astro.slots.has('sidebar'))` to `(book || Astro.slots.has('sidebar') || tocItems.length >= 2)`; `<ArticleTOC items={tocItems} system={sys} />` renders first inside `<aside>` when `tocItems.length >= 2`.

### 6 non-tab article pages

`about`, `using-spheres-of-power`, `legal`, `community-resources`, `how-to-build-spherecaster`, `privacy` — each already calls (or gains a call to) `render(entry)`; pass `headings={headings}` through to `<ArticlePage>`. `casting-traditions/index.astro` is unaffected — its outer `ArticlePage` call passes no `headings`, so the outer page gets no TOC (each tab manages its own via `TabbedContent`).

## Affected Files

| File | Change |
|---|---|
| `src/lib/articleToc.ts` | New — `buildTocTree()` shared by both consumers |
| `src/lib/remarkStripTocFlags.ts` | Sentinel-based exclude strip; drop `.toc-include` handling |
| `src/components/LocalToc.astro` → `src/components/ArticleTOC.astro` | Rename + recursive N-level rendering, renamed class/hook |
| `src/components/TabbedContent.astro` | Use shared `buildTocTree`; rename `ArticleTOC` import/usage |
| `src/layouts/ArticlePage.astro` | New `headings`/`showToc` props, auto-render TOC into sidebar |
| `src/styles/global.css` | `.local-toc` comment → `.article-toc` |
| 6 files under `casting-traditions/` | Strip literal `{.toc-include} ` text |
| `src/pages/about/index.astro`, `using-spheres-of-power/index.astro`, `legal/index.astro`, `community-resources/index.astro`, `how-to-build-spherecaster/index.astro`, `privacy/index.astro` | Pass `headings` through to `ArticlePage` |

## Out of Scope (logged as follow-up, see memory `spheres-wiki-tab-transition-followup`)

- Matching the page-crossfade feel (`astro:transitions` `<ClientRouter />` default) on `TabbedContent`'s tab-switch DOM toggle. Tabs already render all panel content server-side up front — no preloading needed, just a possible CSS fade on the existing `switchTab()` swap. Separate discussion, not bundled into this change.
- Per-intermediate-level collapse (only depth-0 collapses; deeper levels are always visible once their top ancestor is expanded).
- Mobile-specific TOC behavior — inherits whatever `ArticlePage`'s existing `.article-sidebar` responsive rules already do (sidebar goes static/full-width under 1000px).
