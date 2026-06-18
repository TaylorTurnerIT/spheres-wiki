---
created: "2026-06-17"
last_edited: "2026-06-17"
---

# Cavekit: TOC Sidebar Scroll UX

## Scope

Fix two bugs on article page TOC sidebars: (1) jittery auto-scroll caused by firing on every scroll frame; (2) sub-items indented relative to "On This Page" title when they should be flush.

## Requirements

### R1: Sidebar scrolls only when active item changes
**Description:** Sidebar scroll must be gated by a change-detection key so it fires at most once per active-item transition, not on every scroll frame.
**Acceptance Criteria:**
- [ ] `createRecalcHandler` tracks `lastActiveKey` = `"{sectionId}|{subLinkId}"` (empty string if none active)
- [ ] `scrollSidebarToActive` called only when `key !== lastActiveKey`
- [ ] `lastActiveKey` updated before calling scroll so rapid re-entry cannot double-fire
- [ ] No visible jitter when slowly or rapidly scrolling the Custom Traditions article
- [ ] Sidebar does not jump while user holds a fixed page position

### R2: Sidebar scroll is smooth with comfortable padding
**Description:** When the active item changes and is outside the sidebar's visible area, the sidebar scrolls smoothly with 8px padding so the item is not flush against the edge.
**Acceptance Criteria:**
- [ ] `scrollBy` uses `behavior: 'smooth'`
- [ ] Downward scroll: `el.bottom > sb.bottom - 8` triggers scroll by `el.bottom - sb.bottom + 8`
- [ ] Upward scroll: `el.top < sb.top + 8` triggers scroll by `el.top - sb.top - 8`
- [ ] No scroll when active item is fully visible with ≥ 8px margin on both sides

### R3: Article TOC sub-items flush with "On This Page" title
**Description:** h3 sub-items in article TOC must start at the same horizontal position as the title and h2 category links — no extra left indent.
**Acceptance Criteria:**
- [ ] `.article-toc .toc-sub-list` override has `padding-left: 0`
- [ ] Sub-items visually flush with top-level category links on Custom Traditions page
- [ ] Non-article TOC (sphere/class sidebar) retains its existing 10px left indent — unaffected

### R4: Dead scroll-padding-bottom removed
**Description:** `scroll-padding-bottom: 4rem` on `.article-sidebar` was added for a removed scroll approach and is now dead CSS.
**Acceptance Criteria:**
- [ ] `scroll-padding-bottom` removed from `.article-content .article-sidebar` style block
- [ ] No functional regression on keyboard navigation or scroll-to-section behavior

## Out of Scope

- Sidebar width, typography, colors
- TOC on non-article pages (sphere detail, class detail)
- Dark mode
- Mobile layout changes

## Cross-References

- `src/lib/articleTocClient.ts` — R1, R2
- `src/layouts/ArticlePage.astro` (inline `<style>`) — R4
- `src/styles/global.css` — R3

## Changelog

- 2026-06-17: Initial draft. Approach A chosen: change-guard + smooth scrollBy + padding override.
