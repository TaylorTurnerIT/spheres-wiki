# Spheres Wiki — Reconciled Codebase Audit

**Date:** 2026-08-22
**Status:** Final audit synthesis; read-only evidence, no source-code changes
**Scope:** Content resolution, routing and links, UI/accessibility, client lifecycle, build/CI, architecture, and project-governance drift

This document reconciles the original specialist audit and the later six-agent fleet audit. The source reports remain preserved:

- [Original audit](./codebase-audit-report-2026.md)
- [Fleet audit](./codebase-audit-report-2026-fleet.md)

It is the recommended prioritization document. It does not treat every observation in either source report as an equally certain defect.

## Executive verdict

The project has a strong content-first foundation, a useful set of shared UI primitives, and a currently green Astro build. It is not yet safe to declare navigation and content completeness correct, because several important boundaries are independently modeled and some build checks are advisory or false-green.

The highest-risk problem is the unscoped identity used by the resolved-entry maps and render cache. The current `type:id` key loses system and book context in a corpus where duplicate IDs are real. Routing, search, tags, Markdown linking, and errata then make separate assumptions about the same content. This can make an entry disappear, resolve to the wrong entry, or show metadata from a different source.

The next tier is release confidence: missing routes and ordinary Markdown links are not checked against the generated site, collection errors can become empty books, and the TOC/link scripts can report success without validating their targets. View Transition teardown and desktop accessibility have confirmed code defects, although some runtime impact still needs browser-level verification.

The architecture does not need a wholesale rewrite. The safest path is to establish one scoped content/route index, make its diagnostics build-blocking, and then use behavior tests to guide incremental extraction of the largest client components.

## Evidence and confidence

The audit combines:

- static review of the current TypeScript, Astro, Markdown, CSS, scripts, CI, and project documents;
- targeted probes over the current content corpus and generated output;
- the fleet's reported test, validation, Astro-check, build, lint, and post-build scans; and
- reconciliation against `AGENTS.md`, `SPEC.md`, `DESIGN.md`, `FALLOW_GUIDE.md`, and [`docs/lessons-learned.md`](./lessons-learned.md).

Finding labels:

- **Confirmed:** directly demonstrated by current code or a reproducible probe.
- **Latent:** the code permits the defect, but the current corpus or runtime did not exercise it.
- **Candidate:** credible static risk requiring browser or route-level verification before being called a production failure.
- **Stale/incorrect:** an older claim contradicted by the current checkout or by a more precise interpretation of the contract.

The numerical baseline below is the fleet run reported on 2026-08-22. This consolidation did not rerun the long build gates.

| Check | Result | Interpretation |
|---|---:|---|
| `bun run test` | Pass | 31,570 tests across 20 files. Strong pure-logic coverage; not DOM or browser coverage. |
| `bun run validate` | Pass | 6,250 Markdown files, 231 tags, 213 referenced unique tags. |
| `bunx astro check` | Pass | 0 errors, warnings, or hints across 147 files. Type/schema health is not route health. |
| `bun run build` | Pass | 5,763 pages generated; 5,459 pages indexed by Pagefind. The build contains false-green checks described below. |
| Identity probe | Concern | 64 duplicate `type:id` keys: 50 cross-system and 14 same-system/book collisions. |
| Post-build link scan | Concern | 52 unique missing-target candidates; direct checks confirmed several ghost and stale routes. |
| `bun run lint` | Fail | Biome schema mismatch, two JSON formatting failures, and a `!important` warning. |
| Browser/axe smoke suite | Missing | No end-to-end suite currently exercises repeated View Transition navigation, base-path links, or accessibility behavior. |

## Priority findings

### F-01 — Resolved-entry identity is not scoped [P0, confirmed]

**Evidence:** [`src/lib/resolveEntries.ts`](../src/lib/resolveEntries.ts#L23-L24) defines the primary key as `type:id`. The maps are populated with that key at [lines 146–177](../src/lib/resolveEntries.ts#L146-L177), while the raw collection cache also stores unscoped keys at [lines 298–308](../src/lib/resolveEntries.ts#L298-L308).

The current corpus contains 64 duplicate `type:id` keys, including 50 cross-system collisions. Examples reported by the probe include `talent:shadow-strike`, `class-feature:weapon-and-armor-proficiency`, `deathless`, `punishment`, and `dual-wielding-mystic-strike`. Later chronological processing can overwrite an earlier entry; a detail route or render lookup may then use the wrong system's data or find nothing.

This is the most important finding, but the fix must distinguish several identities rather than blindly replacing one string:

- **content lookup identity:** at minimum system + type + id;
- **source/provenance identity:** source book + type + id;
- **route identity:** the actual system/sphere/type route supported by the page tree; and
- **patch identity:** a scoped `modifies` target with an explicit precedence rule.

The 14 same-system/book collisions may be intentional overrides, duplicate content, or unresolved ambiguity. They must be classified before a key is chosen.

**Required outcome:** build a scoped index used by resolution, raw rendering, routes, search, tags, prerequisites, and Markdown linking. Emit a build failure for every unclassified collision, and add tests that verify the resolved object and rendered body come from the same source.

### F-02 — Generated navigation and content routes are not one verified graph [P0, confirmed/candidate mix]

The fleet's post-build scan found 52 unique missing-target candidates. Direct checks confirmed several concrete failures:

- `src/pages/[system]/index.astro` still hardcodes `bear` and `technomancy`, for which no current `dist` pages exist;
- Might and Guile guide links point at missing pages;
- Power quick links include missing feat, equipment, oath, and wild-magic destinations;
- `wild-magic.md` contains the unresolved `@article:wild-magic` reference;
- `lurker.md` uses `/divination`, which omits the system route; and
- `improved-animal-companion.md` links to `/sphere-bestiary`, which is not a current route.

The old report's count of 12 orphaned articles is stale. The current checkout contains 19 article files, with 15 non-built-in candidates requiring a route/embedding decision; several selected articles already have explicit wrappers.

**Required outcome:** derive links from a verified route/content index, or intentionally mark content as embed-only. Validate every internal Markdown and rendered HTML target against the configured `/spheres-wiki/` base path and fail the build for unresolved internal references. Do not solve this by adding routes for synthetic placeholders without deciding whether the content should exist.

### F-03 — Search, tags, and article discovery maintain separate system assumptions [P1, confirmed]

The route problem is amplified by parallel indexes:

- `tags/index.astro` hardcodes sphere headings rather than deriving them from discovered systems;
- `tags/[tag].astro` iterates a fixed system set and omits Champions;
- `search/index.astro` has separate assumptions about classes, archetypes, and articles; and
- `BuiltInArticlePage.astro` supports only selected article collections.

This creates a site where content can exist, build successfully, and still be absent from search or tags. It also makes every new book or system a code-change opportunity despite the content auto-discovery contract.

**Required outcome:** make search, tags, article indexes, landing pages, and route validation consumers of the same scoped index. Keep the `SYSTEMS` registry for system metadata, but do not use a hand-maintained capability set as a substitute for discovered routes. If a system genuinely lacks a page type, represent that capability explicitly and test it.

### F-04 — Collection failures are silently converted into empty books [P1, confirmed/latent]

[`resolveEntries.ts`](../src/lib/resolveEntries.ts#L221-L231) catches every `getCollection()` failure and returns an empty entry list. A malformed frontmatter entry, loader failure, or unexpected Astro error can therefore make an entire book disappear while the build continues.

The metadata-only-folder case is legitimate and is already separated by discovery. It should not be handled by swallowing arbitrary exceptions.

**Required outcome:** skip only explicitly recognized metadata-only folders; rethrow other errors with the book slug and original error. Add a fixture that makes one collection fail and asserts that the build fails visibly.

### F-05 — Errata can overwrite source attribution [P1, latent]

[`applyPatch()`](../src/lib/resolveEntries.ts#L94-L110) merges patch fields into the target without excluding the patch's generated `sourceBook`. The fleet's pure probe reproduced the latent behavior: the resolved entry can acquire the errata book as `sourceBook` while `entrySourceBook` still points at the original.

No current content uses `modifies`, so this is not an observed live corruption, but it violates the documented provenance contract and is dangerous when errata are added.

**Required outcome:** preserve the original source book on the resolved entry, keep patch provenance separately, and test both the resolved metadata and the source rail.

### F-06 — Frontmatter/path precedence is inconsistent [P1, confirmed contract drift]

[`content.config.ts`](../src/content.config.ts#L23-L30) merges `{ ...args.data, ...inferred }`, while `resolveEntries.ts` later merges inferred data, book defaults, and raw frontmatter in a different order at [lines 293–300](../src/lib/resolveEntries.ts#L293-L300).

The older audit's blanket recommendation to reverse the loader spread is unsafe. Project guidance says path-derived `type`, `sphere`, and new-content `system` are authoritative; legacy Power content still carries frontmatter fields that need migration. The issue is not simply “frontmatter always wins.” It is that the normalization contract is implemented twice.

**Required outcome:** define one field-level normalization policy, preserve path authority for derived identity fields, isolate legacy exceptions, and add tests for both valid legacy content and invalid contradictory frontmatter.

### F-07 — Categorization claims are not type-scoped and tag definitions are not normalized [P1, latent]

[`categorize.ts`](../src/lib/categorize.ts#L36-L53) claims entries using raw IDs even though the output distinguishes talents and feats. A same-sphere talent/feat ID collision could hide one entry from a category and from “Other.” The same function lowercases entry tags but compares category-definition tags without normalizing them.

The current corpus scan did not find a same-sphere talent/feat collision, and current category definitions did not demonstrate an uppercase-token failure. These are regression risks, not current P0 failures.

**Required outcome:** claim with `type:id`, compare normalized definition tags, and add fixtures that cover cross-type duplicate IDs and mixed-case YAML.

### F-08 — Prerequisite autolinking excludes punctuation used by real names [P1, confirmed code limitation]

The current matcher in [`remarkEntryLinks.ts`](../src/lib/remarkEntryLinks.ts#L264) does not include hyphens or apostrophes in capitalized names. Names such as “Two-Handed Combat” and possessive titles can be truncated before lookup.

**Required outcome:** extend the matcher conservatively for hyphens, apostrophes, and Unicode apostrophes; add positive and negative fixtures; and run a rendered-content scan so the fix does not create false links.

### F-09 — Book ordering has no deterministic tie-breaker [P1, latent]

[`buildResolvedMaps()`](../src/lib/resolveEntries.ts#L143-L149) sorts only by `publishedDate`. Placeholder dates such as `1970-01-01` can compare equal, leaving precedence dependent on input order.

**Required outcome:** add a stable secondary key such as book slug, document the precedence rule, and test equal-date books and errata.

### F-10 — Casting tradition slot calculation still needs a lower bound [P1, latent]

The older report correctly identified a negative-slot risk, but its claim that `sphereDrawbacks` is omitted is stale: [`builderHelpers.ts`](../src/lib/castingTraditions/builderHelpers.ts#L257-L260) now copies it. The remaining calculation in [`rules.ts`](../src/lib/castingTraditions/rules.ts#L287-L291) can still return a negative count for sufficiently negative drawback values.

**Required outcome:** clamp available boon slots at zero, preserve the existing `sphereDrawbacks` behavior, and add boundary tests for negative, zero, and positive totals.

## UI, accessibility, and lifecycle

### F-11 — View Transition teardown is incomplete [P1, confirmed code risk; runtime impact candidate]

The following handlers are registered during `astro:page-load` without visible teardown:

- header document click handling in `SiteHeader.astro`;
- window resize handling in `StoreCarousel.astro`;
- window scroll handling in `ScrollToTop.astro`; and
- search observers and asynchronous Pagefind work in `search/index.astro`.

This confirms missing cleanup code, not yet a measured memory leak. Repeated navigation can cause duplicate callbacks, stale DOM references, and needless work.

**Required outcome:** use `astro:before-swap` to remove global listeners, disconnect observers, abort asynchronous work, and destroy TomSelect/widget instances. Reuse the existing cleanup pattern in `browseFilterClient.ts` and `ArchetypeSwapper.astro`. Add a browser smoke test that navigates repeatedly and counts callbacks.

### F-12 — Desktop navigation is hidden from assistive technology [P1, confirmed]

`Sidebar.astro` hardcodes dialog semantics and `aria-hidden="true"`, while desktop CSS displays the sidebar. `WikiPage.astro` only toggles the attribute for the mobile menu state. Desktop screen-reader users can therefore lose access to the primary navigation.

Related accessibility candidates include a non-focusable skip-link target, collapsed content that uses `aria-hidden` without managing descendant focusability, incomplete combobox/listbox semantics, removed search focus outlines, missing tab arrow/Home/End behavior, and inconsistent live-region announcements.

**Required outcome:** make the static desktop sidebar a navigational landmark; apply modal semantics only to the mobile open state; make the skip target focusable; and verify keyboard behavior with axe plus manual keyboard traversal.

### F-13 — Several visual contracts are mismatched [P1 confirmed code mismatches; visual effect requires browser check]

Confirmed mismatches include:

- `--clr-body` and `--clr-text-muted` references in `ClassProgressionTable.astro`, `ArchetypeSwapper.astro`, and `Sidebar.astro`, while the global tokens are `--clr-text` and `--clr-muted`;
- `ScrollToTop.astro` selectors expecting full system labels while `WikiPage.astro` supplies IDs such as `power`;
- responsive CSS targeting `.sphere-grid` while `SphereBadgeGrid.astro` emits `.sphere-badge-grid`; and
- custom archetype trait markup bypassing the canonical `EntryCard` idiom.

**Required outcome:** repair token and selector contracts, then verify system colors, mobile grids, focus states, long titles, tables, and article rails in a real browser. Keep per-system color behavior on `--clr-ns`/`--clr-active` as required by `DESIGN.md` and the shared idiom rules.

## Architecture and maintainability

The original audit was strongest in identifying decomposition opportunities. These are worthwhile, but they are architectural P2 work, not reasons to block a release by themselves.

| Hotspot | Recommended boundary | Guardrail |
|---|---|---|
| `power/casting-traditions/index.astro` (~1,350 lines) | Move client state/actions into a `traditionBuilderClient` module; split the Astro shell into builder, selection, drawback, boon, and summary panels. | Preserve the existing pure rules in `src/lib/castingTraditions`; add DOM behavior tests before extraction. |
| `ArchetypeSwapper.astro` (~750 lines) | Separate selector state, compatibility calculation, DOM/table adapter, and TOC refresh into `lib/archetype-swapper/`. | Keep cleanup idempotent and make the shared TOC engine the only scroll-spy implementation. |
| `TabbedContent.astro` (~450 lines) | Decouple tab state from the global article sidebar through a narrow custom event or adapter. | Do not place executable scripts inside inert `<template>` content. |
| `[class].astro` progression math | Move BAB/save/caster calculations to `lib/classProgression.ts`; extract the class information box. | Preserve exact table output with focused unit tests. |
| Repeated artwork, getting-started cards, collapsibles, and headings | Extract only after a grep-backed call-site inventory; reuse `SectionHeading`, `CollapsibleSection`, and existing artwork/card primitives. | Migrate all call sites in one change and extend `check-idioms.mjs` so the old pattern cannot return. |

The project already has valuable architectural seams: `EntryCard`, `EntryDetailPage`, `SYSTEMS`, `url()`, `tocEngine`, `collapseClient`, `levelLabel`, and the cleanup-aware `browseFilterClient`. New abstractions should strengthen these seams rather than create parallel registries or component variants.

## Build, CI, specification, and repository hygiene

### F-14 — Release checks are not one reliable gate [P1/P2, confirmed]

`check-toc.mjs` searches for a route shape that does not match the generated output and exits zero even when it finds problems. `check-links.mjs` inventories targets but does not resolve or reject them. The canonical build also does not run the unit suite, cross-sphere validation, or a route-aware link check, and deployment is not gated on the test workflow.

The old report's claim that `actions/checkout@v5` is invalid is incorrect; v5 is a real published release. The relevant remaining CI issues are non-frozen Bun installs, a test artifact path that is not produced by the configured Vitest reporter, `bun-version: latest`, and the absence of a single deployment quality gate. See the [official checkout releases](https://github.com/actions/checkout/releases).

**Required outcome:** make route-aware link and TOC checks fail non-zero; decide whether the deployment workflow should depend on the test workflow or run the same full gate; use frozen installs and a pinned supported Bun version; and make artifact reporters match their upload paths.

### F-15 — Project documents and implementation have drifted [P2, confirmed]

The project guidance describes Astro 6 and compiler/content-intellisense settings while the package declares Astro 7.2.4 and the current config does not match those flags. `SPEC.md` still describes completed or partially completed casting work as unfinished. It also contains route and custom-404 expectations that do not match the current page tree.

There are additional duplicated system assumptions, including the local system list in `preferences/index.astro` and the explicit “power only” archetype capability set. The latter may be an intentional current capability gap rather than an accidental bug; it needs an explicit product decision and spec status.

**Required outcome:** reconcile package/config/AGENTS/SPEC in one documentation change per decision, mark partial work as partial, and distinguish “unsupported by design” from “missing implementation.”

### F-16 — Performance and repository-cleanliness findings need measured follow-up [P2/P3, mixed confidence]

The generated output contains very large pages, approximately 5.3 MB for `tags/talent/index.html`, 3.5 MB for `tags/basic/index.html`, 2.5 MB for `feats/index.html`, and 1.8 MB for `search/index.html`. Lighthouse currently covers only a small route sample. Five font files are preloaded, including variants that may not be needed immediately, and `scripts/patch-fontsource.mjs` mutates dependency CSS during `postinstall`.

Loose ETL scripts and JSON/text batches exist under `src/content/` and the repository root. They may be valuable migration artifacts, so deletion requires ownership and reproducibility checks rather than an unconditional cleanup.

**Required outcome:** establish route-class performance budgets, measure mobile and interactive pages, load fonts based on actual use, and move or document migration artifacts before removing them.

### F-17 — DOM behavior has little direct test coverage [P2, confirmed gap]

The unit suite is broad for pure helpers but does not exercise the real behavior of search, collapse, article TOC, archetype swapping, the casting builder, or repeated View Transition navigation. Source-string assertions are not substitutes for DOM behavior tests.

**Required outcome:** add a small browser/DOM suite covering base-path navigation, search and tags, class/archetype pages, the casting builder, mobile sidebar behavior, repeated navigation cleanup, reduced motion, and keyboard access.

## Findings deliberately downgraded or corrected

| Earlier claim | Final disposition |
|---|---|
| `actions/checkout@v5` is invalid | Incorrect. v5 exists; fix install/reporter/pinning/gate issues instead. |
| `sphereDrawbacks` is omitted from hypothetical tradition state | Stale. Current `builderHelpers.ts` copies it; retain only the slot-clamp finding. |
| There are exactly 12 unrouted articles | Stale count. Recompute from the current content and explicit route policy. |
| Reverse the content-loader object spread globally | Unsafe. Normalize fields deliberately; path-derived identity remains authoritative for new content. |
| Categorization collisions and mixed-case category tags are active corpus failures | Latent regression risks in the current corpus; add fixtures and diagnostics. |
| Every `SectionHeading` must become a semantic heading | Overstated. Separate eyebrow/group labels from actual document headings and apply semantic tags where the outline requires them. |
| The power-only archetype set is definitely a bug | Not established. It may be a capability gap; document and test the intended support matrix. |
| Raw Wikidot URLs are all dead | Not automatically. Treat them as migration/policy debt and validate whether each should be internalized, redirected, or retained as an external source. |
| `innerHTML` or large components are themselves P0 defects | No. They are complexity and lifecycle risks requiring targeted tests and incremental decomposition. |

## Recommended delivery order

### Phase 0 — Establish the truth surface

1. Preserve a machine-readable collision report for all 64 duplicate keys.
2. Inventory actual generated routes and classify every missing-link candidate.
3. Add fixtures for scoped entries, errata, equal-date books, category collisions, and punctuation-heavy references.
4. Record which fleet gates were run and make the baseline reproducible in CI.

### Phase 1 — Repair data resolution

1. Define scoped content, provenance, route, and patch identities.
2. Update resolved maps and raw render caches together.
3. Fail on unclassified collisions and collection-loader errors.
4. Preserve original source attribution through errata.
5. Consolidate field-level path/frontmatter normalization and add deterministic ordering.

### Phase 2 — Repair the content graph and release gates

1. Generate or validate a route manifest from actual pages and resolved entries.
2. Remove ghost links and decide the article routing policy.
3. Normalize and validate base-path-aware Markdown links and remark references.
4. Derive search, tags, article indexes, and landing navigation from the same index.
5. Replace false-green/advisory TOC and link scripts with failure-producing checks.

### Phase 3 — Harden runtime behavior and accessibility

1. Add `astro:before-swap` teardown for global listeners, observers, async work, and widgets.
2. Repair sidebar, skip-link, collapse, tabs, combobox, focus, and live-region semantics.
3. Fix design-token, system-selector, and responsive-class mismatches.
4. Run browser and axe smoke tests at the GitHub Pages base path, including mobile and reduced-motion cases.

### Phase 4 — Improve architecture and performance

1. Extract the casting builder, archetype swapper, class progression math, and tab/sidebar adapter one boundary at a time.
2. Reuse and extend existing shared idioms; migrate all call sites before adding guards.
3. Reduce oversized tag/search pages and right-size font loading based on measured budgets.
4. Reconcile SPEC, AGENTS, package/config, and CI once the behavior is settled.
5. Inventory ETL artifacts and record ownership before cleanup.

## Definition of done

The audit's highest-risk items should be considered resolved only when:

- every content entry has an explicit, tested scoped identity and every duplicate is classified;
- resolved metadata and rendered bodies cannot come from different entries or source books;
- every internal generated link is base-path-aware and resolves to a known route, or is explicitly marked external/embed-only;
- collection failures, unresolved references, TOC failures, and link failures produce non-zero build results;
- search, tags, routes, and article indexes agree on the same content inventory;
- repeated View Transition navigation leaves no duplicate global listeners, observers, widgets, or async work;
- desktop and mobile navigation pass keyboard and screen-reader checks; and
- the project documents, package versions, CI gate, and actual capability matrix agree.

## Limitations

This is an audit and prioritization document, not a patch series. The fleet reported successful build and static validation, but this consolidation did not rerun those long commands. No browser/axe suite was available to prove runtime listener accumulation, layout overflow, or all accessibility behavior. Those items are identified precisely as code-confirmed risks or browser-verification candidates rather than presented as measured facts.

## Final assessment

The codebase is viable and its content-first direction is sound. The immediate work is to make identity and route truth explicit, then make the build enforce that truth. Once those foundations are stable, lifecycle fixes and incremental component extraction can improve maintainability without destabilizing the site. The original and fleet audits are complementary inputs; this reconciled report is the appropriate source for implementation sequencing.
