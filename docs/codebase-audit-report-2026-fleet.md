# Codebase Audit Report — Spheres Wiki

**Date:** 2026-08-22  
**Mode:** Read-only audit; no source files were modified.  
**Audit fleet:** Six specialists covering logic/runtime behavior, content/schema resolution, UI/accessibility, View Transition lifecycle, build/CI quality, and architecture.

A prior untracked draft was preserved at [codebase-audit-report-2026.md](./codebase-audit-report-2026.md); this file is the reconciled evidence-backed fleet report. Several paths cited by the draft do not exist in the live checkout, so they were not used as audit evidence.

## Executive verdict

The project has a strong content-first foundation, but it is not safe to declare content completeness or navigation correctness. The main risks converge around three boundaries:

1. Entry identity is not consistently scoped by system or source book.
2. Routes, search, tags, and articles use separate hand-maintained assumptions.
3. Client-side lifecycle cleanup is incomplete under Astro View Transitions.

The highest-value architectural improvement is a single scoped content-and-route index that becomes authoritative for resolution, rendering, linking, search, tags, and validation.

## Verification baseline

| Check | Result | Evidence / qualification |
|---|---|---|
| `bun run test` | Pass | 31,570 tests across 20 files. |
| `bun run validate` | Pass | 6,250 files, 231 tags, 213 referenced unique tags. |
| `bunx astro check` | Pass | 0 errors, warnings, or hints in 147 files. |
| `bun run build` | Pass | 5,763 pages generated; Pagefind indexed 5,459 pages. |
| Cross-sphere validation | Pass | 262 expected dual-sphere entries loaded. |
| Fallow | Pass | Current command uses the weaker `new-only` gate. |
| `bun run lint` | Fail | Biome schema mismatch, two JSON formatting failures, and a `!important` warning. |

The successful build does not prove route integrity: its TOC audit is false-green, and the canonical build does not run unit tests, cross-sphere validation, or a route-aware link checker.

## P0 — correctness blockers

### 1. Resolved entries collide across systems and books

`resolveEntries` uses only `type:id` as the runtime key at [`resolveEntries.ts:23`](../src/lib/resolveEntries.ts#L23). Later entries overwrite earlier ones during chronological processing, while the raw render cache also stores unscoped keys at [`resolveEntries.ts:301`](../src/lib/resolveEntries.ts#L301).

The content audit found:

- 64 duplicate `type:id` keys;
- 50 cross-system collisions;
- 14 same-system/book collisions.

Concrete collisions include `deathless`, `punishment`, `shadow-strike`, and `dual-wielding-mystic-strike`. The generated site emits links such as `/might/berserker/deathless/`, but the corresponding route is absent because another system's entry won the unscoped map.

Impact:

- Entries disappear from one system.
- Metadata and rendered Markdown can come from different source books.
- Search, tags, prerequisites, and detail routes can disagree.

**Remediation:** establish one scoped identity, such as `(system, type, id)` or `(sourceBook, type, id)`, and apply it consistently to resolved maps, raw caches, patches, routes, search, and Markdown linking. Add a build-failing collision diagnostic.

### 2. The generated site contains dead internal routes

A post-build HTML scan found 52 unique missing base-path links. Prominent examples come from the system landing page:

- Synthetic `bear` and `technomancy` spheres at [`[system]/index.astro:33`](../src/pages/%5Bsystem%5D/index.astro#L33) have no generated detail pages.
- Might and Guile guide links at [`[system]/index.astro:105`](../src/pages/%5Bsystem%5D/index.astro#L105)–[`133`](../src/pages/%5Bsystem%5D/index.astro#L133) point to missing routes.
- Power quick links at [`[system]/index.astro:418`](../src/pages/%5Bsystem%5D/index.astro#L418)–[`441`](../src/pages/%5Bsystem%5D/index.astro#L441) point to nonexistent feat, equipment, oath, and wild-magic indexes.

`url()` correctly adds the GitHub Pages base path, but cannot make nonexistent destinations valid.

**Remediation:** derive navigation from a verified route registry, or suppress unfinished links until their routes exist.

## P1 — content and architecture defects

### 3. Tags and search omit supported content

The tag index hardcodes every sphere heading through Power at [`tags/index.astro:148`](../src/pages/tags/index.astro#L148), so Might and Guile tag groups link to incorrect routes.

Tag detail pages iterate only Power, Might, and Guile at [`tags/[tag].astro:53`](../src/pages/tags/%5Btag%5D.astro#L53), omitting Champions entirely.

Search similarly excludes Might and Guile classes, non-Power archetypes, and article entries. Its system-specific assumptions begin at [`search/index.astro:29`](../src/pages/search/index.astro#L29). The generic article wrapper is limited to selected collections at [`BuiltInArticlePage.astro:7`](../src/components/BuiltInArticlePage.astro#L7).

The unresolved `@article:wild-magic` reference is emitted literally into generated HTML from [`wild-magic.md:5`](../src/content/ultimate-spheres-of-power/power/casting-traditions/drawbacks/general/wild-magic.md#L5).

**Remediation:** build search, tag, and article indexes from the same resolved route/content registry. Define whether articles are routable or intentionally embed-only; unresolved references should fail the build.

### 4. Collection failures are silently converted into empty books

Every `getCollection()` failure is caught and replaced with an empty entry list at [`resolveEntries.ts:221`](../src/lib/resolveEntries.ts#L221).

A malformed entry or schema failure can therefore remove an entire book while the build continues successfully.

**Remediation:** skip only explicitly recognized metadata-only folders; rethrow schema and loader failures with the book slug and original error.

### 5. Errata patches can corrupt source attribution

`applyPatch()` merges all patch fields except `id` and `modifies` at [`resolveEntries.ts:94`](../src/lib/resolveEntries.ts#L94). That includes the patch book's generated `sourceBook`, violating SPEC V22.

A pure probe reproduced the latent behavior: the resolved entry's `sourceBook` becomes the errata book while `entrySourceBook` still records the original. No current content uses `modifies`, so this is latent rather than presently exercised.

**Remediation:** preserve the original `sourceBook` during patch application and add a regression test against the resolved entry itself.

### 6. Content metadata precedence is inconsistent

The content loader merges inferred fields over frontmatter at [`content.config.ts:26`](../src/content.config.ts#L26), while `resolveEntries` gives frontmatter precedence at [`resolveEntries.ts:294`](../src/lib/resolveEntries.ts#L294). The schema also permits optional `system` and `sourceBook` fields at [`content.config.ts:40`](../src/content.config.ts#L40), despite the documented path-derived contract.

**Remediation:** define one normalization pipeline and formally isolate the intentional tag exception. Add contract tests for path/frontmatter precedence.

### 7. Cross-type IDs can hide entries during categorization

`categorize.ts` tracks claimed entries by raw ID rather than `${type}:${id}`. A talent and feat sharing an ID can cause one to disappear from category output. The relevant shared-claim logic is in [`categorize.ts:36`](../src/lib/categorize.ts#L36) and [`categorize.ts:123`](../src/lib/categorize.ts#L123).

**Remediation:** namespace category claims by entry type and add a duplicate talent/feat fixture.

### 8. Internal Markdown links bypass the GitHub Pages base path

The configured base is `/spheres-wiki/` at [`astro.config.mjs:33`](../astro.config.mjs#L33), but ordinary Markdown links such as those in [`using-spheres-of-power.md:7`](../src/content/ultimate-spheres-of-power/power/articles/using-spheres-of-power.md#L7), [`lurker.md:11`](../src/content/spheres-of-might/might/spheres/scout/talents/lurker.md#L11), and [`improved-animal-companion.md:18`](../src/content/beast-tamers-handbook/might/spheres/beastmastery/talents/improved-animal-companion.md#L18) use root-absolute paths.

The Markdown plugin rewrites explicit entry references, but does not normalize ordinary internal Markdown links. The existing [`check-links.mjs`](../scripts/check-links.mjs#L14) only inventories targets and never resolves or rejects them.

**Remediation:** normalize or validate internal Markdown links during rendering/content validation, including base-path handling and stale targets.

## P1 — client lifecycle and interaction defects

Astro View Transitions replace the document while global listeners, observers, timers, and async work can remain alive.

Confirmed accumulation points include:

- Header document click handler at [`SiteHeader.astro:215`](../src/components/SiteHeader.astro#L215).
- Carousel resize handlers at [`StoreCarousel.astro:49`](../src/components/StoreCarousel.astro#L49).
- Scroll-to-top window handlers at [`ScrollToTop.astro:107`](../src/components/ScrollToTop.astro#L107).
- Search observers and asynchronous Pagefind work at [`search/index.astro:691`](../src/pages/search/index.astro#L691).

Likely effects include duplicate callbacks, stale DOM references, and increased memory use after repeated navigation.

Additional functional issues:

- Casting-builder reset preserves stale query parameters at [`casting-traditions/index.astro:1216`](../src/pages/power/casting-traditions/index.astro#L1216).
- Archetype replacement uses `innerHTML` and can leave the shared TOC observing removed headings at [`ArchetypeSwapper.astro:247`](../src/components/ArchetypeSwapper.astro#L247).
- Header Pagefind loading hardcodes `/spheres-wiki/` at [`SiteHeader.astro:92`](../src/components/SiteHeader.astro#L92), unlike the base-aware full search page.

**Remediation:** introduce a small lifecycle controller that binds on `astro:page-load`, aborts async work, disconnects observers, destroys widgets, and removes global handlers on `astro:before-swap`.

## P1 — accessibility and visual defects

### Accessibility

- The desktop sidebar is visible but permanently `aria-hidden="true"` at [`Sidebar.astro:10`](../src/components/Sidebar.astro#L10), while desktop CSS displays it at [`global.css:210`](../src/styles/global.css#L210).
- The skip-link target is not focusable at [`WikiPage.astro:31`](../src/layouts/WikiPage.astro#L31).
- The header search uses inconsistent combobox/listbox semantics at [`SiteHeader.astro:62`](../src/components/SiteHeader.astro#L62).
- Search explicitly removes focus outlines at [`search/index.astro:151`](../src/pages/search/index.astro#L151).
- Collapsed content sets only `aria-hidden`, leaving descendants keyboard-reachable at [`collapseClient.ts:39`](../src/lib/collapseClient.ts#L39).
- Tab panels lack arrow/Home/End keyboard behavior.
- Search and builder status changes are not consistently announced through live regions.

### Visual/design

- Responsive rules target `.sphere-grid`, but the live component emits `.sphere-badge-grid` at [`SphereBadgeGrid.astro:13`](../src/components/SphereBadgeGrid.astro#L13). The documented responsive breakpoints therefore do not apply.
- Scroll-to-top CSS expects full system labels at [`ScrollToTop.astro:72`](../src/components/ScrollToTop.astro#L72), while `WikiPage` supplies IDs such as `power` at [`WikiPage.astro:35`](../src/layouts/WikiPage.astro#L35).
- Undefined design tokens are used in [`ClassProgressionTable.astro:58`](../src/components/ClassProgressionTable.astro#L58), [`ArchetypeSwapper.astro:689`](../src/components/ArchetypeSwapper.astro#L689), and [`Sidebar.astro:90`](../src/components/Sidebar.astro#L90).
- The tagline uses 11px text and low-contrast rgba color at [`global.css:575`](../src/styles/global.css#L575).
- Archetype pages still render custom trait markup instead of the canonical `EntryCard` primitive at [`[archetype].astro:273`](../src/pages/%5Bsystem%5D/classes/%5Bclass%5D/%5Barchetype%5D.astro#L273).

Long-title overflow, prose-table overflow, and article-rail breakpoints should receive browser verification; they are plausible static risks, not counted as confirmed defects.

## P2 — build and governance drift

### TOC and link gates are false-green or advisory

The TOC checker looks for `/system/spheres/sphere/index.html`, but actual routes are `/system/sphere/index.html` at [`check-toc.mjs:17`](../scripts/check-toc.mjs#L17). It also always exits zero at [`check-toc.mjs:94`](../scripts/check-toc.mjs#L94). The successful build therefore provides no meaningful TOC assurance.

The link checker only prints Markdown targets at [`check-links.mjs:14`](../scripts/check-links.mjs#L14). It does not resolve routes, inspect rendered HTML, or fail on missing links.

### CI does not establish one release gate

The canonical build at [`package.json:11`](../package.json#L11) does not run unit tests, cross-sphere validation, or route-aware link checking. Deployment builds independently of the unit-test workflow: [`deploy.yml:20`](../.github/workflows/deploy.yml#L20) has no dependency on [`test.yml:14`](../.github/workflows/test.yml#L14).

Fallow documentation claims an `all` gate, while the actual script uses `new-only` at [`package.json:20`](../package.json#L20). CI also uses `bun-version: latest` and non-frozen installs.

### Toolchain and specification drift

SPEC and AGENTS describe Astro 6 with Rust compiler/content-intellisense flags, while the package declares Astro 7.2.4 and the config omits those flags at [`package.json:30`](../package.json#L30) and [`astro.config.mjs:52`](../astro.config.mjs#L52).

The SPEC task table also contains stale completed descriptions: T107–T109 still describe the casting builder and tradition logic as absent or incomplete even though those surfaces now exist. This weakens the spec as a current planning source.

### Performance coverage is incomplete

The rebuilt output contains very large pages, approximately:

- 5.3 MB: `tags/talent/index.html`
- 3.5 MB: `tags/basic/index.html`
- 2.5 MB: `feats/index.html`
- 1.8 MB: `search/index.html`

Lighthouse covers only five routes at [`lighthouserc.json:5`](../lighthouserc.json#L5), excluding search, tags, classes, archetypes, the builder, Champions, and mobile-specific paths.

## Recommended work order

1. Scope entry identity and raw content caches; add collision and metadata/body pairing tests.
2. Remove or repair dead routes, synthetic spheres, tag URLs, article references, and root-absolute Markdown links.
3. Replace advisory link/TOC checks with route-aware, failure-producing build gates.
4. Make collection resolution fail closed and preserve errata provenance.
5. Centralize system capabilities and route definitions; derive search, tags, landing pages, and article indexes from them.
6. Add lifecycle teardown for View Transition components and repair casting-builder/archetype state.
7. Fix sidebar, skip-link, search, collapse, focus, and live-region semantics.
8. Reconcile SPEC/package/config/CI versions, pin dependencies, and restore a genuinely enforced quality gate.
9. Add a small browser/axe smoke suite covering base-path navigation, search, tags, classes, archetypes, the builder, mobile layout, and reduced motion.

The architecture does not need a wholesale rewrite. The strongest path is incremental hardening around a single scoped content-and-route index while preserving the existing dynamic routes, `EntryCard`, `resolveEntries`, and healthy `browseFilterClient` cleanup pattern.
