# Feats Browse Spec

This document defines the required behavior and UI/UX contract for the `/feats/` experience.
It is intentionally strict: the page must feel fast, searchable, and easy to scan on desktop and mobile.
The goal is to replace the current megatab pattern with a better reference-table model.

## 1. Purpose

The feats index exists to help users:

- find a feat by name, keyword, sphere, category, or system
- compare feats within a system without opening many pages
- jump quickly from browse mode to the canonical detail page
- avoid being forced through deep navigation before reaching search

The page is a navigation and discovery surface, not a full prose rendering surface.

## 2. Product Principles

The implementation must follow these principles:

- Search first, browse second.
- Show useful context before showing full text.
- Favor fast scanning over dense document dumping.
- Preserve deep links and shareable URLs.
- Keep the page usable with keyboard, screen reader, touch, and mouse input.
- Never hide a huge amount of DOM behind decorative navigation chrome and call it a performant UI.

## 3. Information Architecture

### 3.1 Page structure

The `/feats/` page must have this order:

1. Page title in its normal place (standard `WikiPage` title treatment).
2. Dynamic browse heading (see 3.3), prominently displayed above the search bar.
3. Prominently **centered** search bar with its sorting tools alongside it.
4. Filter row of TomSelect dropdowns (system, category, tags) directly beneath search.
5. Result summary and active filter state.
6. Feats table — **all feats rendered by default**, grouped alphabetically, color coded.
7. Empty, loading, and no-match states.

### 3.3 Dynamic browse heading

The page must prominently show the text `Browse All Feats` above the search bar.

Required behavior:

- when no category is selected, the heading reads `Browse All Feats`
- when a category is selected, the heading updates to `Browse {Category} Feats`
  (e.g. selecting the Necrosis category yields `Browse Necrosis Feats`)
- the heading updates live when the category filter changes, without a reload
- heading changes must be announced to assistive tech (e.g. `aria-live="polite"`)
- the heading uses the display font idiom (Cinzel) and system-aware accent per DESIGN.md

### 3.2 Navigation model

- Search must work across all systems.
- System and category filters refine the table.
- The table must expose all key metadata at a glance.
- Result entries must link to the canonical detail route, not a legacy HTML URL.

## 4. Search Behavior

### 4.1 Search input

The search bar must be visually dominant and immediately visible on page load.

Requirements:

- The input must be placed above all filters and horizontally centered in the content area.
- The placeholder must communicate scope, e.g. `Search feats, tags, spheres, or text`.
- Typing must update results without a page reload.
- Every change in the search system (input text, any filter, any sort control) must
  narrow and modify the table live, **with debouncing** on text input
  (match the 220ms debounce already used by `/search/`).
- Search must support partial matches, not only exact names. Typing `Ability`
  must surface every feat with `Ability` anywhere in its name.
- Name matching is the primary mode. Search must consider at minimum:
  - feat name (substring, case-insensitive — primary)
  - tags
  - sphere
  - source book
  - system
  - category
  - summary text, if available
- A secondary, user-togglable mode must allow matching within the feat
  description/body text (e.g. a `Match description text` checkbox or toggle
  next to the search bar). Off by default; body text is not loaded into the
  initial DOM, so this mode may lazy-load a text manifest on first activation.

### 4.2 Search ranking

Results should rank in this order, unless the query strongly favors a narrower match:

- exact title match
- prefix title match
- tag/category/sphere match
- body text match
- metadata-only match

If Pagefind is used, its ranking should be tuned so the page remains useful for a player who remembers only part of a feat name or a mechanical keyword.

### 4.3 Search state

- Search state must be shareable via URL.
- Reloading the page must preserve the active search query.
- Search state must not be encoded only in `#hash`.
- Search must coexist with system and category filters.

## 5. Filter Controls (TomSelect)

All discrete filters — **category, tags, system**, and any future facet — must be
TomSelect dropdowns. TomSelect is the site's established select/dropdown idiom
(already used by `/search/` and `ArchetypeSwapper.astro`); do not introduce a
second dropdown implementation, segmented control, or ad-hoc chip bar.

### 5.1 Required filters

- **System** (single-select): Spheres of Power, Spheres of Might, Spheres of Guile,
  Champions of the Spheres, All. Order follows the `SYSTEMS` registry order.
- **Category** (single-select): feat categories (`featCategory` tags), plus an
  `All Categories` default. Drives the dynamic browse heading (3.3).
- **Tags** (multi-select): narrows to feats carrying all selected tags.

### 5.2 Filter behavior

Filters must behave like real filters, not decorative controls.

Required behavior:

- changing any filter updates the table immediately (no debounce needed for
  discrete selections; debounce applies to text input only)
- the active selection must be visually obvious in the closed dropdown
- selection changes must be announced to assistive tech
- filter state must persist in the URL
- filters compose with each other and with the search query (logical AND)
- the control row must remain usable on narrow screens

Recommended behavior:

- color system options using the system color from `SYSTEMS` (paired with
  text labels — color never the only signal)
- show matching-feat counts in dropdown options when cheap to compute
- TomSelect initialization must not duplicate existing init code — see §6
  (shared TomSelect setup extracted from `/search/` / `ArchetypeSwapper`)

### 5.3 TomSelect accessibility

TomSelect handles most keyboard/ARIA behavior, but the implementation must verify:

- each dropdown has a visible, programmatically associated label
- keyboard open/navigate/select/clear works on every control
- multi-select tag removal is keyboard reachable
- initialization (re)binds on `astro:page-load` (SPEC V25)

## 6. Component Generalization & Reuse (STRICT)

This page must be built from **generalized, reusable components** that can be —
and are expected to be — reused elsewhere on the site (talent browse, archetype
browse, tag browse are obvious future consumers). This is a hard requirement,
not a style preference. One idiom = one home (AGENTS.md shared-idiom table,
SPEC V49/V70–V72).

Rules:

- **Before writing any new component or helper, check the existing component
  library and `src/lib/` for equivalent functionality.** Duplicating an existing
  idiom is a defect (B23 class). Grep for the pattern, not just known files.
- New UI built for this page must be authored as generalized components in
  `src/components/` with entry-type-agnostic props — nothing feat-specific
  hardcoded where a prop works. Expected extractions:
  - `BrowseControls.astro` (or similar) — dynamic heading + centered search bar +
    sort tools + TomSelect filter row, driven by props/config
  - `BrowseTable.astro` (or similar) — alphabetically grouped, color-coded,
    filterable entry table; columns configurable; renders any named-entry list
  - a shared client module for debounced search + URL-state sync + table
    filtering (pattern already lives in `/search/` — extract, don't copy)
  - a shared TomSelect init helper reused by this page, `/search/`, and
    `ArchetypeSwapper.astro` (three copies of init logic is two too many)
- Tags render through **`TagBadge`** — never reimplemented (SPEC V51). If
  TagBadge lacks a needed capability (e.g. showing the tag's system), extend
  TagBadge with an optional prop; do not fork it.
- Section/group headings use `SectionHeading.astro`; any per-entry card fallback
  uses `EntryCard.astro` (V70/V71).
- All styling via design tokens and `--clr-ns`/`--clr-active` (DESIGN.md);
  no raw system hexes.
- When a shared primitive is extracted, migrate **all** existing call sites in
  the same change and add a grep for the old pattern to `scripts/check-idioms.mjs`.

## 7. Feats Table

The primary browse surface must be a table on desktop and a compact stacked list on mobile.

### 7.1 Default contents, grouping, and color coding

- The table shows **all feats** by default (no filter required to see content).
- Feats are **categorized alphabetically**: grouped under letter headers
  (A, B, C, …) with the feat list sorted by name within each group. Letter
  group headers use the `SectionHeading.astro` eyebrow idiom.
- Rows are **color coded by system**: each row carries the feat's system as a
  `data-system` attribute so the established `--clr-ns` mechanism colors its
  accent (e.g. feat name and/or a slim left stripe) — never raw system hexes,
  and never color as the only signal (the Tags column's system display provides
  the textual pairing).

### 7.2 Table columns

The table has exactly these columns:

| Column | Content |
|---|---|
| **Name** | feat name, linked to the canonical detail route (`getFeatUrl()`), colored via `--clr-ns` |
| **Tags** | rendered with the `TagBadge` component, including the tag's **system**. If `TagBadge` does not currently render system, extend it with an optional toggle prop (e.g. `showSystem`) rather than reimplementing tag display |
| **Prerequisites** | the feat's prerequisite text (auto-linked form where available) |
| **Summary** | the feat's `summary` field. Blank by default — no feats currently have a `summary`; do **not** derive excerpts from body text to fill it |

- **Any blank field renders an em dash (`—`)** — Prerequisites, Summary, even
  an empty Tags cell. No empty cells, no placeholder prose.
- No additional columns (source book, system, category, sphere) in v1; system
  is conveyed by row color coding + tag system display, and full metadata lives
  on the detail page.
- The browse surface must not include the feat body.

### 7.3 Row behavior

Required behavior:

- clicking a row or title opens the canonical detail page
- hovering a row may prefetch only when the result count is modest
- keyboard navigation must work across all result links
- rows should be stable in ordering while filters are changing

Recommended behavior:

- include a small “Open full feat” affordance
- show counts such as `32 feats`
- group results with very similar names only when that improves scanability

### 7.4 Content density rules

The catalog page must not:

- render every feat body in the initial HTML
- render the same feat multiple times in the browse table
- hide a giant DOM subtree and call that an accessibility solution
- repeat huge amounts of prose that belong on the detail page

## 8. Mobile Behavior

On mobile, the table must degrade gracefully into a stacked card list.

Requirements:

- the row order must stay identical to desktop
- each card must preserve the same metadata as the desktop row
- labels must remain scannable without horizontal scrolling
- the search bar and filters must remain reachable without excessive scrolling

Recommended behavior:

- use stacked label/value pairs
- keep the feat name visually prominent
- reduce badge clutter where space is limited

## 9. Pagefind Integration

Pagefind should be part of the implementation, but not the entire experience.

Recommended model:

- index full detail pages for discoverability
- use the feats browse page as a curated front-end to that index
- expose search across all feat metadata
- use Pagefind results and/or a local manifest to power the browse list

Requirements:

- search must be responsive enough to feel local
- the page must not wait for a server round trip
- search should support instant feedback while typing
- filters and search must compose cleanly

If Pagefind alone is insufficient for facet filtering, the page may combine Pagefind search with a local manifest for system/category filtering.

## 10. URL and State Model

The page state must be representable in the URL.

Required pieces:

- selected system
- active category filter
- selected tags
- search query
- description-match toggle state (only when enabled)
- optional sort mode

Preferred format:

- path for the major browse state, or
- query params for all filters

Avoid:

- hash-only state
- state that cannot be shared or reloaded
- state that conflicts with in-page anchor links

## 11. Accessibility Requirements

The page must be usable without a mouse.

Requirements:

- every interactive control must have a visible label
- focus order must be logical and stable
- the search box must be reachable immediately after page load
- filters must be operable from the keyboard
- active selections must have clear visible state
- result links must have descriptive text
- color must never be the only signal for system identity or selection

If the selected system is shown with a color, that color must be paired with text labels and high-contrast active states.

## 12. Responsive Requirements

### 12.1 Desktop

- search bar is centered with a comfortable max width (not edge-to-edge);
  sorting tools sit alongside it
- filters should fit on one row when possible
- the table should use enough horizontal space to keep metadata legible

### 12.2 Tablet

- controls may wrap, but their order must remain readable
- the page should avoid large gutters that waste vertical space

### 12.3 Mobile

- the search bar must stay at the top
- filters must scroll or wrap cleanly without crushing labels
- the table must collapse into stacked rows or cards
- text must remain readable without pinch zoom

## 13. Performance Requirements

The page must feel fast in first load and interaction.

Hard requirements:

- do not render all feat prose in the initial DOM
- avoid a giant hidden content tree
- keep hover prefetch selective, not blanket
- avoid loading unnecessary scripts before the first interaction

Quality targets:

- the initial HTML should be materially smaller than the current megatab approach
- the page should remain usable even with a large catalog
- filter changes should feel instant
- the browser should not be forced to parse a massive, mostly hidden document

## 14. Empty and Edge States

The page must have explicit states for:

- no search query yet
- search query with zero matches
- selected system with zero matching feats
- category with zero matching feats
- Pagefind or search data unavailable

These states must be helpful and not dead-end the user.

Required messaging style:

- explain why the list is empty
- suggest how to recover
- offer one-click reset actions when possible

## 15. Content Quality Rules

The browse page should present the feats as a catalog, not a wall of text.

Rules:

- the Summary column shows only an authored `summary` field; when absent,
  render an em dash — never a derived excerpt or wall of prose
- render an em dash (`—`) for every blank field, table-wide
- show system context via row color coding and tag system display
- avoid redundant prose that duplicates the detail page
- keep labels short and scan-friendly

## 16. Canonical Linking Rules

Every result must link to the canonical feat detail route generated by `getFeatUrl()`.

Rules:

- no legacy HTML links on the feats browse surface
- no dead links to missing route patterns
- no alternate route should become the primary detail destination unless the routing contract is updated site-wide

## 17. Acceptance Criteria

The implementation is acceptable only if all of the following are true:

- the page opens with the title in its normal place, the dynamic browse heading,
  and a prominently centered search bar with sorting tools
- the heading reads `Browse All Feats` and live-updates to
  `Browse {Category} Feats` when a category is selected
- the table shows all feats by default, grouped alphabetically and color coded
- the table columns are exactly Name, Tags (TagBadge, with system), Prerequisites, Summary
- every blank field renders an em dash
- typing `Ability` narrows the table (debounced) to feats with `Ability` in the name
- an optional toggle enables matching within description text
- category, tags, and system filters are TomSelect dropdowns and compose with search
- the selected state is reflected in the URL
- the page does not render any feat body up front
- new UI is delivered as generalized reusable components with no duplicated idiom (§6)
- keyboard users can fully operate the page
- mobile layout remains readable and usable
- canonical detail links resolve correctly
- inactive content does not create a giant hidden DOM burden

## 18. Non-Goals

The first version does not need:

- automatic feat summaries for every entry — the Summary column stays em-dash
  blank until real `summary` frontmatter is authored; excerpt derivation is
  explicitly out of scope
- server-side search
- infinite scroll
- personalization
- analytics
- a complex social or recommendation system

The page should be excellent at lookup and browsing before it becomes clever.
