# Feats Browse Implementation Checklist

This checklist converts the feats browse spec into concrete implementation work.
It is written to support a strict, incremental rollout with clear file ownership and acceptance criteria.

## 1. Scope

Target experience:

- `/feats/` becomes a search-first catalog page.
- Desktop uses a compact table layout.
- Mobile uses stacked rows/cards with the same data.
- Search and filters are shareable through the URL.
- Canonical detail pages remain the source of full feat prose.

Non-goals:

- no tabbed feat panels
- no giant hidden DOM of feat bodies
- no summary-generation dependency before the UI can ship

## 2. Primary Files

The implementation should center on these files:

- [`src/pages/feats/index.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/pages/feats/index.astro)
- [`src/pages/search/index.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/pages/search/index.astro)
- [`src/lib/featCategories.ts`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/lib/featCategories.ts)
- [`src/lib/resolveEntries.ts`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/lib/resolveEntries.ts)
- [`src/config/site.ts`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/config/site.ts)
- [`src/components/EntryCard.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/components/EntryCard.astro)

Likely supporting files:

- [`src/components/TagBadge.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/components/TagBadge.astro) — extend with optional `showSystem` prop
- [`src/components/TabbedContent.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/components/TabbedContent.astro) — current feats-index consumer to unwire (component itself stays; it has other consumers)
- [`src/components/SectionHeading.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/components/SectionHeading.astro) — letter group headers
- [`src/components/ArchetypeSwapper.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/components/ArchetypeSwapper.astro) — existing TomSelect consumer (dedup target)
- [`src/lib/url.ts`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/lib/url.ts)
- [`src/content.config.ts`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/content.config.ts) — optional `summary` field on feat entries

New generalized components/modules to create (see section 2.1):

- `src/components/BrowseControls.astro` (working name) — dynamic heading + centered search + sort tools + TomSelect filter row
- `src/components/BrowseTable.astro` (working name) — alphabetical, color-coded, filterable entry table
- shared TomSelect init helper in `src/lib/` (extracted from `/search/` + `ArchetypeSwapper`)
- shared client module for debounced search + URL state + table filtering

### 2.1 Component generalization rules (STRICT)

These are hard requirements, mirrored from spec §6:

- **Always check the component library and `src/lib/` before creating anything new.**
  Grep for equivalent markup/logic (search page, ArchetypeSwapper, EntryCard,
  SectionHeading, TagBadge, tocEngine/collapseClient precedent) — duplicated
  functionality is a defect, not a shortcut (SPEC V49/V70–V72, bug B23).
- Every new component built for this page must be **generalized and reusable**:
  entry-type-agnostic props, no feat-specific hardcoding where a prop works.
  Talent/archetype/tag browse pages are expected future consumers.
- Extend existing components (e.g. TagBadge `showSystem`) instead of forking them.
- When extracting a shared primitive from existing pages, migrate **all** call
  sites in the same change and add a grep for the old pattern to
  `scripts/check-idioms.mjs`.
- All styling through design tokens + `--clr-ns`/`--clr-active`; no raw system hexes.

## 3. Required UX Shape

### 3.1 Top of page

- Keep the page title in its normal place; intro brief.
- Render the dynamic browse heading prominently above the search bar:
  `Browse All Feats` by default, live-updating to `Browse {Category} Feats`
  when a category is selected (e.g. `Browse Necrosis Feats`). Use
  `aria-live="polite"` for the update.
- Place a prominently **centered** search bar with its sorting tools below the heading.
- Put the TomSelect filter row directly beneath search.
- Make the default state useful without requiring prior clicks — the full
  table renders on load.

Acceptance check:

- the user can start typing immediately on page load
- no tab row is needed to reach the search field
- selecting the Necrosis category changes the heading to `Browse Necrosis Feats`

### 3.2 Filters (TomSelect)

- All discrete filters are TomSelect dropdowns: **system** (Power, Might, Guile,
  Champions, All — single), **category** (single, drives heading), **tags** (multi).
- Initialize via the shared TomSelect helper (section 2), rebinding on
  `astro:page-load` (SPEC V25).
- Keep filters compact enough to remain scannable.
- Preserve active filters in the URL; filters + search compose as logical AND.

Acceptance check:

- any filter change updates the table instantly
- filter state survives reload
- filters are readable on mobile
- no second dropdown implementation exists — TomSelect only

### 3.3 Results table

- Render **all feats** as table rows on desktop, grouped alphabetically under
  letter headers (`SectionHeading` idiom), sorted by name within each group.
- Color code rows by system via `data-system` + `--clr-ns` (name color and/or
  left accent stripe); never raw hexes, never color-only signaling.
- Columns exactly: **Name** (canonical detail link), **Tags** (TagBadge with
  system display), **Prerequisites**, **Summary**.
- Every blank field renders an em dash (`—`).
- Render the same content as stacked cards on mobile.
- Use canonical detail links only.

Acceptance check:

- the user can compare feats without opening detail pages
- blank Prerequisites/Summary cells show `—`, never empty space
- detail pages remain the only place with full prose

### 3.4 Live search behavior

- Debounce text input (~220ms, matching `/search/`); every search-system change
  narrows and modifies the table in place.
- Primary match: case-insensitive substring on feat name — typing `Ability`
  surfaces every feat with `Ability` in its name.
- Secondary fields: tags, sphere, source book, system, category, summary.
- Optional `Match description text` toggle (off by default) extends matching
  into feat body text; body text lazy-loads on first activation, never in
  initial DOM.

Acceptance check:

- typing filters without reload or jank
- description matching activates only on explicit toggle

## 4. Data Model Tasks

### 4.1 Build a browse manifest

Create a lightweight manifest for feats that includes:

- `id`
- `name`
- `system`
- `category`
- `sphere`
- `sourceBook`
- `tags`
- `prerequisites`
- `summary` (nullable — see 4.2)
- `href`

Acceptance check:

- the browse page can render without pulling full body HTML into the index
- the manifest is stable and deterministic

### 4.2 Summary column strategy

- Add an optional `summary` string field to the feat entry schema in
  `src/content.config.ts`.
- The Summary column renders `summary` when present; otherwise an em dash (`—`).
- **Do not derive excerpts from body text.** No feats currently have a summary;
  the column ships blank (all em dashes) and fills in as summaries are authored.
- The em-dash-for-blank rule applies to every column, not just Summary.

Acceptance check:

- a feat with no summary shows `—`
- no derived/truncated body text appears anywhere in the table

### 4.3 Description-match text source

- For the optional description-match mode, provide a separate lazy-loaded
  plain-text manifest (or Pagefind hook) of feat body text.
- It must not be part of the initial page payload.

Acceptance check:

- initial HTML contains zero feat body text
- toggling description match fetches the text source once, then filters locally

### 4.4 TagBadge system display

- Extend `TagBadge.astro` with an optional prop (e.g. `showSystem?: boolean`,
  default `false`) that renders the tag's system alongside the label
  (TagBadge already receives `tag.system`; today it only emits a `data-system`
  attribute with no visible rendering).
- All existing call sites keep current behavior (prop defaults off).
- The feats table Tags column passes `showSystem` so system identity is textual,
  not color-only.

Acceptance check:

- tags in the feats table display their system
- no other page's tag rendering changes
- no inline tag markup reimplementation anywhere (SPEC V51)

### 4.5 Canonical URL hygiene

- Keep using `getFeatUrl()` as the canonical destination.
- Do not introduce a separate legacy path for the browse table.
- Verify that browse links match the real detail routes.

Acceptance check:

- no dead links in the feats table
- no old-site HTML links on the feats browse surface

## 5. Page Architecture Tasks

### 5.1 Rebuild `/feats/`

Replace the current megatab render path in [`src/pages/feats/index.astro`](/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/pages/feats/index.astro) with a table-driven catalog.

Must remove or stop depending on:

- full-body rendering for every feat
- hidden tab panels
- category content duplication across tabs

Acceptance check:

- initial HTML is materially smaller
- page load does not require parsing the full feat corpus as body HTML

### 5.2 Keep `/search/` aligned

Use the existing search page as the reference for:

- data loading patterns
- filter interaction patterns
- URL-backed state
- client-side update behavior

Acceptance check:

- the feats page feels like the catalog counterpart to `/search/`
- controls behave consistently across both surfaces

### 5.3 Unwire `TabbedContent` from the feats index

The current feats index renders category tabs of full feat bodies through the
shared `TabbedContent.astro` component (note: `FeatsTabbedContent` was already
deleted in the cohesion remediation — do not reference it).

- Remove the `TabbedContent` usage and all per-feat `render()`/`Content` calls
  from `src/pages/feats/index.astro`.
- Keep `TabbedContent.astro` itself — it has other live consumers
  (casting-traditions). Verify with `fallow dead-code --trace` before any deletion.

Acceptance check:

- there is no tabbed-feats experience left behind by accident
- `TabbedContent` remains intact for its other consumers

## 6. Search Tasks

### 6.1 Search scope

Search must cover:

- feat name (case-insensitive substring — primary)
- tags
- system
- category
- sphere
- source book
- summary (when present)
- description/body text — only when the description-match toggle is on

Acceptance check:

- a user can find a feat from partial memory alone (`Ability` → all feats with
  `Ability` in the name)
- search works across all systems, not just the active filter
- text input is debounced (~220ms); discrete filter changes apply immediately

### 6.2 Search state

- Store the search query in the URL.
- Restore search on page load.
- Compose search with system/category filters.

Acceptance check:

- a shared URL reproduces the same result set
- search does not conflict with in-page anchor links

### 6.3 Pagefind strategy

Use Pagefind for broad content discovery, but do not depend on Pagefind to render the browse UI structure.

Recommended split:

- Pagefind indexes detail pages
- the browse page uses a local manifest plus search hooks
- the index page remains fast and deterministic

Acceptance check:

- browse UX remains usable even if search ranking changes
- search implementation does not force a heavy DOM payload

## 7. Accessibility Tasks

### 7.1 Keyboard support

- Search input must be first in tab order.
- Filters must be keyboard operable.
- Table rows must have a single clear primary link.
- Focus states must be obvious.

Acceptance check:

- a keyboard user can fully operate the page without guessing

### 7.2 Screen reader support

- Label search and filters clearly.
- Announce the current result count.
- Announce active filter state.
- Ensure mobile card labels still read sensibly when stacked.

Acceptance check:

- the page is understandable without visual scanning alone

### 7.3 Color and contrast

- Use system colors as accents, not as the only signal.
- Keep text contrast high on all control states.
- Preserve readability in both light and dark contexts.

Acceptance check:

- system color treatment does not reduce legibility

## 8. Responsive Tasks

### 8.1 Desktop table

- Use a dense, readable table.
- Keep columns narrow enough to avoid excessive wrapping.
- Make the Name column the most prominent cell.

Acceptance check:

- the table feels like a reference index, not a dashboard

### 8.2 Mobile cards

- Collapse rows into cards or stacked blocks.
- Preserve the same data fields as desktop.
- Keep the primary action obvious.

Acceptance check:

- no horizontal scrolling is required to use the page

## 9. Performance Tasks

### 9.1 Reduce initial HTML

- Stop rendering every feat body in the initial document.
- Render only browse metadata.
- Avoid duplicating the same feat across tabs or panels.

Acceptance check:

- the page is substantially lighter than the current implementation

### 9.2 Prefetch discipline

- Reevaluate `data-astro-prefetch="hover"` on bulk result links.
- Keep prefetch selective if the list is large.

Acceptance check:

- hovering over many feats does not create avoidable network churn

### 9.3 Stable rendering

- Keep row order deterministic.
- Avoid expensive client-side reshuffles on every keystroke.

Acceptance check:

- typing remains responsive with a large catalog

## 10. Content and Copy Tasks

### 10.1 Table copy

- Write the page intro as a one-line utility statement.
- Keep column labels short.
- Keep filter labels specific.

Acceptance check:

- the page reads as a practical lookup tool, not a marketing page

### 10.2 Summary column rules

- Show the authored `summary` frontmatter value only; blank renders `—`.
- Keep authored summaries concise enough to fit a table row.
- No derived snippets — the column stays em-dash blank until summaries are written.

Acceptance check:

- the Summary column never contains derived body text
- blank fields across all columns render `—`

## 11. Validation Tasks

### 11.1 Route correctness

- Verify every browse row points to an existing detail route.
- Verify the system and category filters do not create phantom URLs.

Acceptance check:

- no 404s from the feats browse page

### 11.2 Regression coverage

Add or update tests for:

- feat URL generation
- browse manifest shape
- search/filter state composition
- absence of legacy HTML links on the feats index surface

Acceptance check:

- the new UX contract is protected from future regressions

### 11.3 Build gate

- Run the full build gate after implementation.
- Do not treat the change as complete until the build is clean.

Acceptance check:

- the implementation passes the repo’s normal verification flow

## 12. Suggested Rollout Order

1. Extract shared primitives first: TomSelect init helper (dedup `/search/` +
   `ArchetypeSwapper`), debounced-search/URL-state client module, TagBadge
   `showSystem` prop, optional `summary` schema field.
2. Add the browse manifest (metadata only; nullable `summary`).
3. Build the generalized `BrowseControls` (dynamic heading + centered search +
   sort + TomSelect filters) and `BrowseTable` (alphabetical groups, color
   coding, em-dash blanks) components.
4. Rebuild `/feats/` on those components; unwire `TabbedContent` and all
   per-feat body rendering from the index.
5. Wire search + filters + description-match toggle to URL state.
6. Render mobile stacked cards.
7. Add tests and verify route correctness.
8. Tune prefetch and visual density.
9. Run the full build gate (`bun run build`) — includes idiom guard; add greps
   for any newly retired patterns to `scripts/check-idioms.mjs`.

## 13. Final Acceptance Definition

The work is done when:

- `/feats/` opens fast and feels like a proper catalog
- the dynamic heading reads `Browse All Feats` and live-updates per category
  (`Browse Necrosis Feats`, etc.)
- the search bar is prominently centered with its sorting tools and filters
  the table live, debounced
- category/tags/system filters are TomSelect dropdowns sharing one init helper
- the table shows all feats, alphabetically grouped, color coded, with exactly
  Name / Tags (TagBadge + system) / Prerequisites / Summary columns and em
  dashes for every blank field
- new UI ships as generalized reusable components with zero duplicated idioms
- desktop and mobile both present the same information cleanly
- the page does not carry the old megatab payload
- canonical detail pages remain the source of full feat text

