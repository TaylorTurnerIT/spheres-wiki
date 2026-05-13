# TOC Collapse/Expand with Scroll Tracking

**Date:** 2026-05-13  
**Scope:** `TableOfContents.astro` + `global.css`

## Goal

On sphere pages (`/power/alteration`, `/might/athletics`, etc.), the right-rail TOC collapses all categories by default. As the user scrolls, the active category expands to show all its sub-items with the currently-visible talent highlighted. Categories collapse when the user leaves them.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Expanded state | All sub-items visible, active highlighted | Best orientation — see position and context |
| Animation | Smooth slide, ~200ms ease | Polished feel, safe for scroll-driven changes |
| TOC overflow | `overflow-y: auto` + `max-height: calc(100vh - 32px)` | Prevents TOC overflowing viewport on long pages |
| Active detection | Intersection Observer + `recalc()` scan | Performant, handles fast scroll, no scroll event listeners |
| System color | CSS custom property `--clr-system` scoped to `.toc` | One CSS rule covers all systems; no per-system repetition |

## Architecture

Five files change:

- `src/components/TableOfContents.astro` — new HTML structure, inline `<script>`, updated prop interface
- `src/styles/global.css` — updated `.toc*` rules for collapsed/active/sticky states
- `src/pages/power/[sphere]/index.astro` — pass `system` prop to `<TableOfContents>`
- `src/pages/might/[sphere]/index.astro` — same
- `src/pages/guile/[sphere]/index.astro` — same

**Initial load state:** On page load, `recalc()` runs immediately. The first category (Overview) is at the top of the viewport and satisfies the "heading above 25% mark" condition, so it expands by default. User sees Overview open, all others collapsed.

## Component Changes

### Props

```ts
interface Props {
  items: TocItem[];
  system: 'power' | 'might' | 'guile' | 'champ';
}
```

### HTML Structure

```html
<nav class="toc" style="--clr-system: var(--clr-{system})">
  <p class="toc-title">On This Page</p>
  <ul class="toc-list">
    <li class="toc-category" data-toc-section="{cat.id}">
      <a href="#{cat.id}" class="toc-cat-link">{cat.label}</a>
      <ul class="toc-sub-list">
        <div class="toc-sub-inner">
          <li><a href="#{item.id}" data-toc-item="{item.id}">{item.label}</a></li>
          ...
        </div>
      </ul>
    </li>
    ...
  </ul>
</nav>
```

Key attributes:
- `data-toc-section` on `<li>` — links category to page heading with matching `id`
- `data-toc-item` on sub-links — JS marks the currently-visible talent
- `.toc-sub-inner` wrapper — lets `maxHeight` transition work accurately (JS reads `scrollHeight` of inner div, sets `maxHeight` on outer `ul`)

## CSS

```css
/* TOC container — sticky, scrollable */
.toc {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}

/* Sub-list collapsed by default */
.toc-sub-list {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease;
}

/* JS sets max-height to scrollHeight px when active — no static CSS rule needed */

/* Active category label */
.toc-category.is-active > .toc-cat-link {
  color: var(--clr-system);
  font-weight: 600;
}

/* Active sub-item (currently visible talent) */
.toc-sub-list a.is-current {
  color: var(--clr-foreground);
  font-weight: 600;
}
```

## JavaScript

Inline `<script>` in `TableOfContents.astro`. Re-initializes on `astro:page-load` for ViewTransitions compatibility.

```js
function initToc() {
  const nav = document.querySelector('.toc');
  if (!nav) return;

  const categories = [...nav.querySelectorAll('[data-toc-section]')];
  const headings = categories
    .map(cat => ({
      cat,
      heading: document.getElementById(cat.dataset.tocSection),
      subLinks: [...cat.querySelectorAll('[data-toc-item]')],
    }))
    .filter(s => s.heading);

  function setActive(active) {
    categories.forEach(cat => {
      const subList = cat.querySelector('.toc-sub-list');
      const isActive = cat === active;
      cat.classList.toggle('is-active', isActive);
      if (subList) {
        subList.style.maxHeight = isActive
          ? subList.scrollHeight + 'px'
          : '0';
      }
    });
  }

  function recalc() {
    // Find last heading above 25% of viewport = current section
    let current = headings[0]?.cat ?? null;
    for (const { cat, heading } of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.25) {
        current = cat;
      }
    }
    setActive(current);

    // Highlight active sub-item
    const allSubLinks = nav.querySelectorAll('[data-toc-item]');
    let activeSub = null;
    for (const { subLinks } of headings) {
      for (const link of subLinks) {
        const el = document.getElementById(link.dataset.tocItem);
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

  recalc(); // Set initial state on load
}

document.addEventListener('astro:page-load', initToc);
```

**Why `recalc` scans instead of using IO state directly:** IO can fire multiple entries at once during fast scroll. Scanning all headings on each IO callback gives correct state regardless of scroll speed or how many headings entered/left simultaneously.

## Affected Files

| File | Change |
|---|---|
| `src/components/TableOfContents.astro` | New HTML, script, `system` prop |
| `src/styles/global.css` | Update `.toc`, `.toc-sub-list`, add `.toc-category.is-active`, `.is-current` |
| `src/pages/power/[sphere]/index.astro` | Pass `system={sphere.data.system}` to `<TableOfContents>` |
| `src/pages/might/[sphere]/index.astro` | Same |
| `src/pages/guile/[sphere]/index.astro` | Same |

## Out of Scope

- Mobile (TOC hidden at <1024px — no change needed)
- Click-to-toggle (scroll-driven only; clicking a link navigates normally)
- Other page types (talent detail pages, feat pages — no TOC component)
