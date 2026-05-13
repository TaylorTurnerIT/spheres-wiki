# TOC Collapse/Expand with Scroll Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On sphere pages, the right-rail TOC collapses all categories by default and expands the active one as the user scrolls, with the currently-visible talent highlighted inside.

**Architecture:** Intersection Observer watches each category heading; on any intersection change it rescans all heading positions to determine the active section, then updates TOC CSS classes and `maxHeight` to drive the slide animation. A `--clr-system` CSS custom property scoped to `.toc` makes active-state color dynamic per system without per-system CSS rules.

**Tech Stack:** Astro 4.x, vanilla JS (no framework), CSS custom properties, Intersection Observer API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/styles/global.css` | Modify | Add sticky/overflow to `.toc`; collapsed default + transition on `.toc-sub-list`; active category and current sub-item highlight rules |
| `src/components/TableOfContents.astro` | Rewrite | New HTML with `data-toc-section` / `data-toc-item` attributes, `.toc-sub-inner` wrapper, `system` prop, Intersection Observer script |
| `src/pages/power/[sphere]/index.astro` | Modify | Pass `system="power"` to `<TableOfContents>` |
| `src/pages/might/[sphere]/index.astro` | Modify | Pass `system="might"` to `<TableOfContents>` |
| `src/pages/guile/[sphere]/index.astro` | Modify | Pass `system="guile"` to `<TableOfContents>` |

---

## Task 1: Update TOC CSS in global.css

**Files:**
- Modify: `src/styles/global.css` (lines 1588–1636)

The `.toc-sub-list` currently always shows. We need it collapsed by default, with a height transition driven by JS. We also need `.toc` to be sticky and scrollable.

Note: CSS `max-height` transitions require a numeric starting value (`0`) and a JS-set numeric end value. The `.toc-sub-inner` wrapper (added in Task 2) has its `overflow: hidden` so content clips during the animation.

For `position: sticky` on `.toc` to work, its parent `.right-rail` must stretch to fill the grid row height. Currently `.right-rail` has `align-self: start` which limits its height to its content — preventing sticky from activating. We remove that and let `.right-rail` default to `align-self: stretch`.

- [ ] **Step 1: Replace the `.right-rail` rule**

In `src/styles/global.css`, find and update the `.right-rail` block (around line 1576):

```css
/* BEFORE */
.right-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: start;
}

/* AFTER */
.right-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: start;
}
```

(`align-items: start` controls how children align inside the flex container; `align-self: start` is removed so the grid stretches `.right-rail` to full content height, enabling sticky.)

- [ ] **Step 2: Replace the entire TOC CSS block**

Find the `/* ── TableOfContents ── */` section (lines 1588–1636) and replace it entirely:

```css
/* ── TableOfContents ────────────────────────────────────── */
.toc {
  background: var(--clr-surface);
  border: 0.5px solid var(--clr-border);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: var(--fs-xs);
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}
.toc-title {
  font-family: var(--font-display);
  font-size: var(--fs-3xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--clr-muted);
  margin-bottom: 6px;
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.toc-cat-link {
  color: var(--clr-text);
  text-decoration: none;
  line-height: 1.3;
  display: block;
}
.toc-cat-link:hover {
  color: var(--clr-brand);
}
.toc-category.is-active > .toc-cat-link {
  color: var(--clr-system);
  font-weight: 600;
}
.toc-sub-list {
  list-style: none;
  padding: 0 0 0 10px;
  margin: 0;
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease;
}
.toc-sub-inner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}
.toc-sub-list a {
  font-size: var(--fs-2xs);
  color: var(--clr-muted);
  text-decoration: none;
  line-height: 1.3;
  display: block;
}
.toc-sub-list a:hover {
  color: var(--clr-brand);
}
.toc-sub-list a.is-current {
  color: var(--clr-text);
  font-weight: 600;
}
```

- [ ] **Step 3: Verify build still passes**

```bash
cd spheres-wiki && npm run build
```

Expected: build completes with no errors (TOC still renders since component unchanged yet — sub-lists will show collapsed but CSS is inert until JS added in Task 2).

- [ ] **Step 4: Commit**

```bash
git -C spheres-wiki add src/styles/global.css
git -C spheres-wiki commit -m "style: TOC sticky, collapsed sub-lists, active/current highlight rules"
```

---

## Task 2: Rewrite TableOfContents.astro

**Files:**
- Modify: `src/components/TableOfContents.astro`

Full rewrite. New structure adds `data-toc-section` on each `<li>`, `.toc-cat-link` class on category anchors, `.toc-sub-inner` wrapper inside sub-lists, and `data-toc-item` on sub-links. The `system` prop feeds `--clr-system` as an inline CSS variable. The `<script>` block uses Intersection Observer to track scroll position.

- [ ] **Step 1: Replace the entire file**

```astro
---
export interface TocItem {
  id: string;
  label: string;
  sub?: Array<{ id: string; label: string }>;
}

interface Props {
  items: TocItem[];
  system: 'power' | 'might' | 'guile' | 'champ';
}

const { items, system } = Astro.props;
---
{items.length > 0 && (
  <nav class="toc" aria-label="On this page" style={`--clr-system: var(--clr-${system})`}>
    <p class="toc-title">On This Page</p>
    <ul class="toc-list">
      {items.map(item => (
        <li class="toc-category" data-toc-section={item.id}>
          <a href={`#${item.id}`} class="toc-cat-link">{item.label}</a>
          {item.sub && item.sub.length > 0 && (
            <ul class="toc-sub-list">
              <div class="toc-sub-inner">
                {item.sub.map(s => (
                  <li><a href={`#${s.id}`} data-toc-item={s.id}>{s.label}</a></li>
                ))}
              </div>
            </ul>
          )}
        </li>
      ))}
    </ul>
  </nav>
)}

<script>
function initToc() {
  const nav = document.querySelector<HTMLElement>('.toc');
  if (!nav) return;

  const categories = [...nav.querySelectorAll<HTMLElement>('[data-toc-section]')];
  const headings = categories
    .map(cat => ({
      cat,
      heading: document.getElementById(cat.dataset.tocSection!),
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

  function recalc() {
    // Last heading whose top edge is at or above 25% of viewport = current section
    let current: HTMLElement | null = headings[0]?.cat ?? null;
    for (const { cat, heading } of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.25) {
        current = cat;
      }
    }
    setActive(current);

    // Highlight the deepest sub-item whose top is at or above 40% of viewport
    const allSubLinks = nav.querySelectorAll<HTMLAnchorElement>('[data-toc-item]');
    let activeSub: HTMLAnchorElement | null = null;
    for (const { subLinks } of headings) {
      for (const link of subLinks) {
        const el = document.getElementById(link.dataset.tocItem!);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) {
          activeSub = link;
        }
      }
    }
    allSubLinks.forEach(l => l.classList.toggle('is-current', l === activeSub));
  }

  const observer = new IntersectionObserver(recalc, {
    rootMargin: '-5% 0px -5% 0px',
    threshold: [0, 1],
  });
  headings.forEach(({ heading }) => observer.observe(heading));

  recalc();

  return () => observer.disconnect();
}

document.addEventListener('astro:page-load', initToc);
</script>
```

- [ ] **Step 2: Verify build still passes**

```bash
cd spheres-wiki && npm run build
```

Expected: build completes with no TypeScript or Astro errors. The build will warn that `system` prop is not yet passed from the page files — this is OK until Task 3.

Actually the build will error because `system` is required in Props. Confirm build errors before moving to Task 3 only if the error is NOT about the missing `system` prop. A "missing prop" TypeScript error is expected and will be resolved in Task 3.

- [ ] **Step 3: Commit**

```bash
git -C spheres-wiki add src/components/TableOfContents.astro
git -C spheres-wiki commit -m "feat: TOC collapse/expand with scroll-driven Intersection Observer"
```

---

## Task 3: Wire `system` prop in all three sphere page files

**Files:**
- Modify: `src/pages/power/[sphere]/index.astro` (line ~278)
- Modify: `src/pages/might/[sphere]/index.astro` (line ~278)
- Modify: `src/pages/guile/[sphere]/index.astro` (line ~278)

Each file has `<TableOfContents items={tocItems} />` in its right-rail aside. Add `system` with the hardcoded value matching the page's system. The system is always the same within each file (power pages are always power, etc.).

- [ ] **Step 1: Update power page**

In `src/pages/power/[sphere]/index.astro`, find:
```astro
<TableOfContents items={tocItems} />
```
Replace with:
```astro
<TableOfContents items={tocItems} system="power" />
```

- [ ] **Step 2: Update might page**

In `src/pages/might/[sphere]/index.astro`, find:
```astro
<TableOfContents items={tocItems} />
```
Replace with:
```astro
<TableOfContents items={tocItems} system="might" />
```

- [ ] **Step 3: Update guile page**

In `src/pages/guile/[sphere]/index.astro`, find:
```astro
<TableOfContents items={tocItems} />
```
Replace with:
```astro
<TableOfContents items={tocItems} system="guile" />
```

- [ ] **Step 4: Verify build passes cleanly**

```bash
cd spheres-wiki && npm run build
```

Expected: zero errors, zero TypeScript warnings about missing `system` prop.

- [ ] **Step 5: Commit**

```bash
git -C spheres-wiki add src/pages/power/\[sphere\]/index.astro src/pages/might/\[sphere\]/index.astro src/pages/guile/\[sphere\]/index.astro
git -C spheres-wiki commit -m "feat: pass system prop to TableOfContents for dynamic accent color"
```

---

## Task 4: Dev Server Verification

**Files:** None — manual testing only.

- [ ] **Step 1: Start dev server**

```bash
cd spheres-wiki && npm run dev
```

Open `http://localhost:4321` (or whatever port Astro reports).

- [ ] **Step 2: Navigate to a power sphere page**

Go to `/power/alteration/`. Confirm in the right rail:
- TOC is visible
- All categories show as collapsed (only category labels, no sub-items visible)
- Overview category is expanded (first category, its heading is at top of page on load)

- [ ] **Step 3: Test scroll-driven expand/collapse**

Scroll down slowly past the "Body Talents" heading. Confirm:
- "Body Talents" expands with a smooth slide animation (~200ms)
- Previous category (Overview) collapses simultaneously
- "Body Talents" category label turns the power blue color (`#174b93`)

Continue scrolling through several more categories. Each should expand as you enter and collapse as you leave.

- [ ] **Step 4: Test active sub-item highlight**

While inside "Body Talents", scroll slowly through individual talents. Confirm a talent name in the TOC becomes bold/foreground-colored as that talent reaches roughly 40% from the top of the viewport.

- [ ] **Step 5: Test fast scroll**

Scroll rapidly to the bottom of the page. Confirm the last category is active and no categories are stuck in an incorrect state.

- [ ] **Step 6: Test TOC overflow**

On Alteration (or any sphere with many categories), expand a long category. Confirm the TOC container scrolls within itself if content exceeds viewport height — it does not overflow the page or clip content.

- [ ] **Step 7: Test sticky behavior**

Scroll down slowly. Confirm the TOC stays fixed in the right rail (sticks to top of viewport) while the main content scrolls beneath it.

- [ ] **Step 8: Test other systems**

Navigate to `/might/athletics/` (or any might sphere). Confirm active category color is the might red (`#8f2d00`). Navigate to `/guile/` sphere and confirm guile purple (`#5a2d96`).

- [ ] **Step 9: Test ViewTransitions**

Click a link to a different sphere page (e.g., from Alteration to another Power sphere). Confirm:
- TOC reinitializes correctly on the new page
- Active category reflects the scroll position on the new page (Overview open by default)
- No stale observer from the previous page causes incorrect behavior

- [ ] **Step 10: Commit final verification note**

```bash
git -C spheres-wiki commit --allow-empty -m "chore: TOC collapse/expand verified in dev server"
```
