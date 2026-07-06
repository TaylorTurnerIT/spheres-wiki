# Project Context
@AGENTS.md
@SPEC.md
@DESIGN.md
@FALLOW_GUIDE.md
@docs/lessons-learned.md

# AGENTS.md — Spheres Wiki

Orientation for AI agents & new contributors. Explains **how project laid out & how to work in it**. For **what project must do** — goal, constraints, interface contracts, invariants, task backlog, bug log — read [`SPEC.md`](./SPEC.md), source of truth. Code/SPEC.md disagreement → bug to reconcile.

## What this is

Fast, static reference wiki for **Spheres** tabletop RPG system (Drop Dead Studios), replacing legacy Wikidot site. **Content-first**: nearly all game data lives as markdown + yaml under `src/content/`; site auto-discovers it — adding book, sphere, or talent requires no code changes.

Four player-facing systems: **Power**, **Might**, **Guile**, **Champions**. Pathfinder 1e base classes (`system: "pf1e"`) exist only as carriers for sphere archetypes; never appear on system index pages.

## Tech stack

- **Astro 6.x** static site generator + **TypeScript** (no server runtime)
  - `experimental.rustCompiler: true` with `@astrojs/compiler-rs`
  - `experimental.contentIntellisense: true`
- **Pagefind** for client-side search (index built at deploy)
- **TomSelect** for select/dropdown UI; vanilla CSS (`src/styles/global.css`), no framework
- Self-hosted fonts via `@fontsource/cinzel` + `@fontsource/crimson-text` — **no external CDN, no analytics** (see SPEC V11/V12)
- **Bun ≥ 1.1.0**
- Deployed to **GitHub Pages** at base path `/spheres-wiki/` (`astro.config.mjs`)

## Commands

```bash
bun install            # setup
bun run dev            # dev server → http://localhost:4321
bun run build          # validate → check-idioms → check-base → fallow-audit → astro check → astro build → pagefind → check-toc
bun run preview        # serve the production build locally
bun run validate       # content validation only (scripts/validate.mjs)
bun run fallow         # run comprehensive codebase audit (dead code, health, duplication)
bun run fallow-audit   # build-blocking Fallow audit: zero new dead-code/complexity/duplication findings
bun run test           # unit tests (Vitest)
bunx astro check       # Astro/Volar type check; must report 0 errors, 0 warnings, 0 hints
```

`just` wraps common ones: `just run` (default) = `test → validate → build → preview`; also `just test`, `just validate`, `just build`, `just preview`.

CI (`.github/workflows/`): `test.yml` runs Vitest + content validation on push/PR; `deploy.yml` builds & publishes to GitHub Pages on push to `main`.

## Repository layout

```
src/
  pages/              file-based routes (see SPEC §I.pages for the full route map)
  layouts/
    Base.astro          html shell: meta/OG tags, fonts, global.css, footer
    WikiPage.astro      header + sidebar + tab nav + content slot; sets Pagefind indexing scope
  components/         Astro UI components (SVGSprite, RefCard, TabNav, Sidebar, SiteHeader/Footer,
                      BetaToast, ErrataNotice, Store*, Tag*, etc.)
  lib/                pure logic + data resolution (see "Key files" below)
  config/site.ts      SYSTEMS registry — single source of truth for system metadata (SPEC V5)
  content/            all game content, auto-discovered (see "Content model" below)
  content.config.ts   Zod entry schema + collection discovery
  styles/global.css   design tokens, layout, per-system theming via --clr-ns
  assets/covers/      book cover images (.webp)
scripts/              content ETL + validators (Wikidot parsing, tag/link/v2 checks)
tests/
  lib/                Vitest unit tests
public/               static passthrough (robots.txt, etc.)
docs/                 supporting docs
```

## Content model (read this before touching content)

Books **auto-discovered**: folder under `src/content/` registered as collection iff has both `_book.yaml` **and** ≥1 `.md` entry (`content.config.ts`). `_book.yaml`-only folders allowed as metadata/store placeholders; not Astro collections, must not be passed to `getCollection()`.

```
src/content/<book-slug>/
  _book.yaml          # title, publisher, publishedDate, price?, buyUrl?, coverImage?
                    # system? is a legacy field (pre-T54/T55 migration); do NOT add to new books
  spheres/<id>.md
  feats/<id>.md
  classes/<id>.md
  class-features/<id>.md
  class-traits/<class>/<id>.md
  archetypes/<id>.md
  archetype-features/<class>/<id>.md
  articles/<id>.md
  tags/<id>.md
  ...                 # entry type is inferred from the path by lib/inferFromPath.ts
```

Entry types (discriminated union on `type` in `entrySchema`): `sphere`, `talent`, `feat`, `class`, `class-feature`, `class-trait`, `article`, `archetype`, `archetype-feature`, `tag`. `entrySchema` uses direct `zod` import, not deprecated `astro:content` `z`.

Frontmatter intentionally minimal — `inferFromPath` fills `type`/`sphere`/`system` from file location. **Do not add `system:` to entry frontmatter** — derived from `{book}/{system}/` directory prefix (SPEC V26, C11). Example talent at `src/content/ultimate-spheres-of-power/power/spheres/alteration/talents/*.md`:

```yaml
---
id: my-talent          # lowercase kebab-case, must equal the filename (SPEC V16)
name: My Talent
# system and sphere inferred from path — do not add them here
tier: basic
tags: ["transformation", "utility"]
---
Talent body in markdown. Internal links resolve via the remarkEntryLinks plugin.
```

> **Migration note**: Power entries under `ultimate-spheres-of-power/` still carry legacy `system: power` frontmatter (T54/T55 not done). Legacy that needs fixing; must not be added to new content.

**Class-family entry fields:**

| Entry type | Key fields beyond base |
|---|---|
| `class` | `hitDie`, `alignment`, `startingWealth`, `skillRanks`, `classSkills`, `babProgression`, `fortSaveProgression`, `refSaveProgression`, `willSaveProgression`, `classTable` (JSON), `casterTier` (high\|mid\|low\|none) |
| `class-feature` | `className`, `level` (number or number[]), `isTraitContainer?` |
| `class-trait` | `className`, `featureId`, `requires?`, `tags` (e.g. `["extraordinary"]`) |
| `archetype` | `className`, `spheres?` (string[] for cross-referencing) |
| `archetype-feature` | `archetypeId`, `level`, `replaces?`, `alters?`, `mutuallyExclusive?` (default true), `classOverrides?`, `isAlternateClassFeature?` |

`class-traits/` files organized per-class (e.g. `class-traits/shifter/shifter-bestial-rage.md`), use `featureId` to link to parent feature. `archetype-features/` follow same per-class convention.

Special cases:
- **`__built-in__/`** — house book holding cross-sphere/system tags (`type: tag`).
- **Errata / patches** — entry with `modifies` field overrides another; patches apply in `publishedDate` order; must not alter original `sourceBook` (SPEC V21–V23).
- **PF1e classes** — `system: "pf1e"`; archetypes carry sphere system they grant; `"Spheres {Class}"` archetype sorts first (SPEC §I.content).

Adding content:
- **New book** → create folder + `_book.yaml` + one `.md`. Nothing else (SPEC V2).
- **New sphere in existing system** → add content files; appears site-wide automatically. Only code touch allowed: one `<symbol id="si-{name}">` in `SVGSprite.astro` for icon (SPEC C6, V3, V19).
- **New game system** → cross-cutting; touch `site.ts`, CSS, nav, pages (SPEC C7).

## Key files

| File | Responsibility |
|------|----------------|
| `src/content.config.ts` | `entrySchema` (Zod) + auto-discovery of real book collections (`_book.yaml` + `.md`) |
| `src/lib/inferFromPath.ts` | derives `type`/`sphere`/`system` from content file path |
| `src/lib/resolveEntries.ts` | builds `ResolvedMaps`, applies errata patches, links entries; keeps `_book.yaml` metadata for all books; fetches only real Astro collections; exports `getCollEntriesMap()` for cached raw entries |
| `src/lib/categorize.ts` | groups sphere's talents/feats into display sections (+ "Other") |
| `src/lib/url.ts` | base-path-aware link helper — **use `url()` for every internal link** (SPEC C2) |
| `src/lib/remarkEntryLinks.ts` | remark plugin: `@talent`/`@feat`/`@sphere`/`@class` refs & prerequisites → links during markdown build |
| `src/lib/types.ts` | entry + `ResolvedMaps` TypeScript types |
| `src/lib/tags.ts` | `buildOrderedTagIds()` — auto-injects system tags (talent, feat, sphere, class-trait, tiers), sorts by tag priority |
| `src/lib/renderBody.ts` | Markdown rendering pipeline (unified) + `splitBodyOnMarkers()` for base-ability extraction + `stripBodySource()` (V42) |
| `src/config/site.ts` | `SYSTEMS` registry: label, color, route, subtitle, etc. (single source — SPEC V4/V5) |
| `src/lib/systems.ts` | system helpers over `SYSTEMS`: `getSystemPaths()`, `resolveSystem()`, `getSystemSearchFilter()`, `systemCssKey()`, `buildSystemIdIndex()`/`systemIdKey()` |
| `src/lib/levelLabel.ts` | `ordinal()`/`levelLabel()` — "1st", "3rd, 5th" class-feature level formatting |
| `src/lib/tocEngine.ts` | shared sidebar TOC scroll-spy engine (`createTocEngine`) — sole scroll-spy implementation |
| `src/lib/collapseClient.ts` | shared collapse/expand behavior (`bindCollapseToggle`, `setCollapsibleState`) — sole collapse implementation |
| `src/lib/articleToc.ts` | `buildTocTree()` — builds nested TOC tree from rendered headings |
| `src/lib/articleTocClient.ts` | thin adapter over `tocEngine` for article pages; imported via `<script>` in `ArticlePage.astro`. Exposes `window.reinitArticleToc` for `TabbedContent` after sidebar TOC inject. Must be standalone module (not inline in `ArticleTOC.astro`) — `ArticleTOC` renders inside `<template>` tags where scripts inert |
| `src/components/EntryCard.astro` | canonical named-entry card (V70/V71) — every talent/feat/trait/drawback/boon/tradition card |
| `src/components/EntryDetailPage.astro` | canonical detail-page shell (breadcrumb + title + tags + prerequisites + body + source rail) — talent/feat/trait detail routes are thin `getStaticPaths` wrappers around it |
| `src/components/SectionHeading.astro` | group/eyebrow section headings — no inline `.section-group-header` markup |
| `src/components/SVGSprite.astro` | every sphere icon `<symbol>` (+ `si-fallback`) |
| `scripts/check-idioms.mjs` | build-blocking idiom guard (V72): EntryCard primitive, cssKey ternaries, per-system color vars |
| `scripts/class-parser.mjs` | Parses Wikidot class source → class/feature/trait `.md` files |
| `scripts/generate-bestial-traits.mjs` | Parses Shifter Bestial Trait Wikidot source → trait `.md` files |

## Conventions & gotchas

- **Internal links** must go through `url()` — hardcoded `/...` paths break under `/spheres-wiki/` base (SPEC C2). Every nav/sidebar link must resolve to real route; no dead links (SPEC V1/V9).
- **Interactive JS** (search init, dropdowns, toasts) must (re)bind on `astro:page-load`, not `DOMContentLoaded` — View Transitions swap DOM, drop listeners (SPEC V25; bug B1).
- **System theming** comes from `--clr-ns` custom property set by `data-system` attribute — never add per-system accent blocks to `global.css` (SPEC V4/V10).
- **Placeholders**: stub dates must be `1970-01-01`; stub strings conspicuously fake (`"PLACEHOLDER"`/`"TBD"`) — never plausible-but-wrong (SPEC §P).
- **Privacy**: no external requests, analytics, or tracking; document any `localStorage` key (name, purpose, retention, deletion path); keep `/privacy/` accurate (SPEC V11–V14).
- **IDs**: lowercase kebab-case, must equal filename (SPEC C10/V16).
- **Source attribution**: Never write `*Source: Book*` into markdown bodies. Source shown via `.talent-source` label on headings (from `sourceBook` + `bookMetaMap`) and `SourceBookCallout` in sidebar. Existing `*Source:*` lines stripped by `stripBodySource()` at render.
- **Class trait rendering**: Traits render via `EntryCard.astro` (name + source top row, `TagBadge` via `buildOrderedTagIds()` bottom row) — never inline the `.talent-header` pattern (V70, guard-enforced). `class-trait` tag auto-injected — never hardcode label span.
- **Prerequisites**: On trait entries, `requires` frontmatter renders as `**Prerequisites:** {req}` below heading — never inline `(requires ...)`.
- **ACFs**: Alternate Class Features are `archetype-feature` entries with `isAlternateClassFeature: true`. Use `archetypeId: {class}-alternate-class-features` (virtual — no content file).
- **Markdown config**: use `markdown.processor: unified({ remarkPlugins })` from `@astrojs/markdown-remark`. Do not use deprecated top-level `markdown.remarkPlugins`.
- **Component scripts in `<template>` tags inert**: Component with `<script>` rendered inside `<template>` (e.g. `TabbedContent.astro` per-tab TOC templates) — script never executes. Client-side logic must live in external module imported via layout's `<script>` block (see `articleTocClient.ts` imported by `ArticlePage.astro`).
- **Build strictness**: `bun run build` must complete without Astro check diagnostics, Fallow findings, idiom-guard violations, Vite warnings, unresolved remark links, or TOC audit failures. `vite.build.chunkSizeWarningLimit` intentionally strict at 200KB.
- **Build concurrency — three rules in `getStaticPaths()`:**
  1. Never loop book metadata slugs with sequential `await getCollection()`. Metadata-only `_book.yaml` folders not collections. Use `getCollEntriesMap()` from `resolveEntries.ts` — built in same parallel pass as `resolveEntries()`, shared across page files.
  2. Multiple independent async ops (e.g. `render()` calls for set of entries) → wrap in `Promise.all([...])`, not `await` in loop.
  3. Never look up an entry by `id`+`system` with `[...map.values()].find(...)` inside a loop — O(n²) at build. Build `buildSystemIdIndex(map.values())` once before the loop and use `index.get(systemIdKey(system, id))` (`src/lib/systems.ts`).

## Shared idioms — reuse, never reimplement

One idiom = one home. Cohesion remediation (2026-07-06, SPEC B23/V70–V72) removed a dozen parallel reimplementations; `scripts/check-idioms.mjs` blocks the ones grep can catch, but the principle covers all of these:

| Idea | Sole implementation | Never do |
|---|---|---|
| Named-entry card (talent/feat/trait/drawback/boon/…) | `EntryCard.astro` (V70/V71) | inline `.talent-header`/`.talent-header-top` markup (guard-enforced) |
| Entry detail page | `EntryDetailPage.astro` shell | per-route breadcrumb + title + tag row + source rail bodies |
| Section/group headings | `SectionHeading.astro` | inline `.section-group-header` eyebrow markup |
| Tab panels (md entries or custom slots) | `TabbedContent.astro` | forking a per-page tabbed component (see deleted `FeatsTabbedContent`) |
| System id → CSS class | `systemCssKey()` | `=== 'champions' ? 'champ'` ternaries (guard-enforced) |
| System labels/colors/routes | `SYSTEMS` registry + `resolveSystem()` | local `SYSTEM_LABELS`-style parallel records (V5/V53) |
| Per-system coloring in page/component styles | `--clr-ns`/`--clr-active` (set by global.css classes / `data-system`) | `var(--clr-power\|might\|guile\|champ)` in page styles (guard-enforced, V10) |
| Sidebar TOC scroll-spy | `tocEngine.ts` | a second IntersectionObserver/scroll implementation |
| Collapse/expand sections | `collapseClient.ts` | ad-hoc grid-rows toggle handlers |
| Level ordinals ("3rd, 5th") | `levelLabel.ts` | inline `ordinal()` copies |
| Tag badge + colors | `TagBadge` + tag entry `color` (SSR templates for client JS) | client-side tag-markup or color tables (V51) |
| Source-line stripping | `stripBodySource()` in `renderBody.ts` | per-page regex copies |

When extracting the next shared primitive: migrate **all** call sites in the same change (grep for the markup/pattern, not just known pages — that miss caused B23), then add a grep for the old pattern to `scripts/check-idioms.mjs` so it cannot come back. Extend the guard's allowlists deliberately, never to silence a violation.

## Scripts & content pipeline

`scripts/` holds Wikidot import/ETL & validators — not part of runtime site:
- `validate.mjs` + `check-idioms.mjs` (both run in `bun run build`), plus `validate-tags.mjs`, `validate-v2.mjs`, `check-links.mjs`, `purge-dead-links.mjs`
- parsers/generators: `parse-wiki.mjs`, `class-parser.mjs`, `archetype-parser.mjs`, `generate-tags.mjs`, `generate-bestial-traits.mjs`, `catalog.mjs`, `migrate-to-nested.mjs`, `download_covers.py`
- shared script helpers live in `scripts/lib/` (`content-files.mjs` `getMarkdownFilesRecursively`, `render.mjs`, `wikidot-markup.mjs`) — reuse before writing a new file walker or renderer
- Fallow entrypoints are the `entry` array in `.fallowrc.json`; register any standalone script you touch there. Keep ETL helpers small to avoid complexity findings, and see the `--gate all` warning under "Fallow local gate" before editing the legacy parsers.
- See `scripts/PARSE-WIKI.md` for parsing workflow.
- See `docs/lessons-learned.md` for operational lessons from performance, Biome, Fallow fixes.

## Might sphere migration (Wikidot → Markdown)

Spheres of Might content migrated from Wikidot via Rust parser in sibling `ftml/` crate. Workflow documented in `ftml/examples/CLAUDE.md` and SPEC.md §M.

### Adding a new sphere

1. Read raw source at `../spheresofpower-wikidot-archive/pages/<sphere>.txt`
2. Inventory headings (H1 `+`, H2 `++`, H4 `++++`), bracket citation keys `[Key]`, paren tags `(tag)`
3. Add new keys to `../ftml/conf/might-lexicon.toml` — never guess book slugs; verify via legal page (`legal:start.txt`) or DriveThruRPG
4. Add `*_section_defs()` + `*_sphere_entry()` to `../ftml/examples/export_might.rs`, wire in `main()`
5. Build: `LIBGIT2_NO_PKG_CONFIG=1 ... cargo build --example export_might`
6. Validate: `cargo run --example export_might -- <source> --sphere <id> --lexicon ... --validate`
7. Resolve quarantine: add missing lexicon entries OR acknowledge for manual creation
8. Force-write: `--force` generates `.md` files under `src/content/<book>/might/spheres/<sphere>/`
9. Create tag definitions: `src/content/spheres-of-might/might/tags/<tag>.md` (unless tag exists in Power)
10. Run `bun run build` — must pass cleanly with 0 errors/warnings/hints/findings

### Post-write cleanup

- Delete `QUARANTINE-<sphere>.md` from `src/content/spheres-of-might/` (blocks Astro build)
- Delete non-talent H4 entries (e.g. `unarmed-combatants.md`, `table-practitioner-unarmed-damage.md` from unarmed spheres; `note-shields-and-shield-bonuses.md` from Shield)
- Fix auto-generated `_book.yaml` titles — auto-generator drops colons from Apocrypha titles
- Fix duplicate IDs across spheres (e.g. `smash` → `smash-brute`) — rename file, update `id` frontmatter
- Run `python3 sweep_formatting.py` and `python3 strip_html_blocks.py` against output dir

### Content routing

Parser writes entries to `{book}/might/spheres/{sphere}/` based on resolved citation key:
- `[Key] = "book-slug"` → `src/content/book-slug/might/...`
- `[Apoc]` with body `Source:` → specific apoc book folder
- `[3PP]` (`__DEFERRED__`, changed from `__SKIP__` 2026-06-11) → resolved via body source if available; quarantined otherwise
- No citation key → `spheres-of-might/might/...` (primary book)

### Quarantine

Quarantined entries: parser cannot route to book:
- `[Apoc]`/`[DRS]`/`[SM—]`/`[3PP]` without body `Source:` line
- Unknown bracket tokens not in `citation_keys` or `bracket_ability_tags`
- Unknown paren tags not in `paren_tags`

## Guile sphere migration (Wikidot → Markdown)

Spheres of Guile uses same pipeline as Might: Rust parser `../ftml/examples/export_guile.rs` + `../ftml/conf/guile-lexicon.toml`. Detailed spec at `context/kits/cavekit-guile-conversion.md`.

### Critical rules (universal — applies to Might and Power too)

**Section def heading matching:** `parse_heading_line()` strips parentheticals like `(Ex)` from heading names. Section def headings must match stripped version. Use `"##4B0092|Acclimate ##"` not `"##4B0092|Acclimate (Ex)##"`.

**Sentinel H2 sections:** "Sphere Packages"/"Drawbacks"-style sections — sentinel H2 entries whose H4 children are actual entries. Section heading must not produce entry. Use `exclude_base` guard in `convert_sphere()`.

**Body source extraction:** `extract_body_source_title()` searches 10 lines after heading (not 1). Some entries have prereq/benefit text before `^^Source:` line.

**Count-match rule:** `grep -c '^++++ ' source.txt` = total H4 count. Subtract sentinel H4 entries (descriptive headings under sentinel sections). Result must equal parser's `Parsed:` count minus 1 (sphere entry). Documented at `context/kits/cavekit-guile-conversion.md` §V.

**Body-diff rule:** Original sphere intro text (between end of Wikidot boilerplate and first H2) must match generated sphere body verbatim. Excludes Wikidot markup parser strips.

**Tags across systems:** Tags in Power or Might must NOT be redefined in Guile (V37/V38). Check before creating. If tag needs better definition, update existing one.

**Quarantine files:** `QUARANTINE-*.md` anywhere in `src/content/` blocks Astro builds. Delete after resolution.

**3PP entries:** Changed from `__SKIP__` to `__DEFERRED__` in all three lexicons (2026-06-11). Entries with body sources resolve; those without need Library of Metzofitz lookup.

### Post-write cleanup

- Verify sphere `.md` entry was copied (sometimes missed due to nested path from force-write)
- Delete `QUARANTINE-<sphere>.md` from `src/content/` (blocks Astro build)
- Delete non-talent H4 entries (sentinel headings that produced entries)
- Delete nested book directories under `spheres-of-guile/guile/spheres/` (parser path quirk)
- Check duplicate tags across systems — use existing definitions where possible

Quarantined entries NOT auto-generated. Must be manually created in correct book folder, or acknowledged and skipped.

## Testing

- **Unit** (`tests/lib/`, Vitest): schema/resolution/categorize/tags/url/search/etc. Run with `bun run test`.

When adding feature or fixing bug, prefer adding/extending test. Run targeted tests, then `bun run build` before handoff; build includes content validation, Fallow, Astro check, Astro build, Pagefind, TOC audit.

---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

Before `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If verdict `fail`, fix findings before retry. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking. Only dependency ignored in `.fallowrc.json` for framework loading is `@astrojs/compiler-rs`; do not add broad ignores for code issues.

Audit defaults `gate=new-only`: only findings from current changeset affect verdict. Inherited findings on touched files reported under `attribution` with `introduced: false`, do not block commit.

**But the build gate is stricter**: `bun run fallow-audit` (inside `bun run build`) runs `fallow audit --max-crap 30 --fail-on-issues --explain --gate all` — **every** finding in a changed file blocks, including pre-existing ones the change didn't introduce. Consequence: adding even a one-line import to a legacy high-complexity script (e.g. the Wikidot parsers `parse-wiki.mjs`/`class-parser.mjs`/`archetype-parser.mjs`) marks the whole file "changed" and surfaces its inherited complexity findings as build failures. Before touching such a file, either budget for refactoring it fully under the thresholds, or leave it untouched and put shared code elsewhere. Standalone scripts also need an `entry` registration in `.fallowrc.json` once touched, or they gate as unused files.

Non-skill agents: treat task map below as local onboarding source — run listed fallow command before destructive edits, commits, PR handoff.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- fallow:setup-hooks:end -->
