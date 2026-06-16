# SPEC — Spheres Wiki

> Single source of truth for **what** this project must do: goal, constraints, interface contracts, invariants, open tasks, and bug log.
> For **how to work in the repo** (structure, commands, content model, conventions) see [`AGENTS.md`](./AGENTS.md).

## §G Goal

Fast static wiki for the Spheres tabletop RPG (Power/Might/Guile/Champions) by Drop Dead Studios — a replacement for the legacy Wikidot site. Content-first: adding a new book/sphere/talent requires only markdown + yaml files, no code changes. Mobile-first UX, ranked client-side search. Deployed to GitHub Pages at `/spheres-wiki/`.

---

## §C Constraints

- C1. Static site only — Astro SSG, no server runtime
- C2. GitHub Pages deploy — base path `/spheres-wiki/`, all URLs via `url()` helper
- C3. Content auto-discovered — new book folder (`_book.yaml` + `.md`) requires zero code registration
- C4. Search client-side only — Pagefind index built at deploy time
- C5. OGL compliance — all content under Open Game License; legal page must exist
- C6. New sphere in existing system must appear site-wide with only content files added (no component edits) — except icon SVG which requires one `<symbol>` addition to SVGSprite.astro
- C7. New game system requires coordinated changes across config, CSS, nav, pages — this is acceptable but must be documented in §I
- C8. Toolchain pinned — Astro 6.x SSG + TypeScript, Bun ≥ 1.1.0
- C9. Entry metadata path-encoded — `src/content/<book>/<system>/<type>/*.md`; `type`+`sphere` inferred from path by `inferFromPath` (I.content); `system` derived from directory, not frontmatter
- C10. All entry `id`s are lowercase kebab-case (`^[a-z0-9-]+$`), enforced by `entrySchema`
- C11. `system:` field ⊥ in entry frontmatter — always derived from `{book}/{system}` directory prefix; ∃ only in `_system.yaml` at `{book}/{system}/`
- C12. Large assets (images/book covers) managed via Git LFS — local development requires `git-lfs` to prevent build failures due to missing image metadata

---

## §I Interfaces / External Surfaces

### I.content — book folder contract
```
src/content/<book-slug>/
  _book.yaml              # title, publisher, publishedDate, price?, buyUrl?, coverImage?
  <system>/               # power | might | guile | champions (1 dir per authored system)
    _system.yaml          # id, name — only for books that define a system (core books)
    spheres/<sphere>.md   # sphere-type entry (id = sphere slug)
    spheres/<sphere>/talents/<talent>.md  # talent entry
    feats/*.md            # feat entries
    classes/<class>.md    # class entry
    class-features/<feature>.md  # class feature entry
    class-traits/<class>/<trait>.md  # class trait entry (per-class subdir)
    archetypes/<archetype>.md       # archetype entry
    archetype-features/<class>/<feature>.md  # archetype feature entry (per-class subdir, also holds ACFs)
    articles/*.md         # article entries
    tags/*.md             # tag entries
```
Entry types: `sphere | talent | feat | class | class-feature | class-trait | article | archetype | archetype-feature | tag`

**PF1e base class convention:** PF1e base classes (Fighter, Rogue, etc.) stored as `ClassEntry` with `system: "pf1e"`. Their archetypes use `system: "power"|"might"|"guile"|"champions"` to indicate which sphere system they grant. Archetype named `"Spheres {ClassName}"` (e.g. `"Spheres Fighter"`) is the canonical base conversion and always sorts first in its class group. PF1e classes never appear on system index pages (filtered by system ∈ power/might/guile/champions only).

### I.resolveEntries — data API
`resolveEntries()` → `ResolvedMaps`: sphereMap, talentMap, featMap, classMap, classFeatureMap, classTraitMap, articleMap, archetypeMap, archetypeFeatureMap, tagMap, bookMetaMap, entrySourceBook

### I.config — system registry (target state)
`src/config/site.ts` exports single `SYSTEMS` record keyed by system id:
```ts
{ label, color, darkColor, route, cssKey, subtitle, classLabel, description, introLinkText }
```
Plus `ANNOUNCEMENT: string | null`, `SITE_TITLE`, `SITE_TAGLINE`, `HEADER_NAV`.

### I.svg — icon contract
`SVGSprite.astro` defines `<symbol id="si-{name}">` for each sphere icon name. Sphere entries reference by `icon: {name}` field. `si-fallback` symbol must exist as default.

### I.categorize — section builder
`src/lib/categorize.ts`: groups a sphere's talents/feats into display sections from the sphere's `categoryDefinitions`/`sectionDefinitions`. Unmatched entries fall into an "Other" catch-all. Each entry is claimed by the first matching category (see V24).

### I.pagefind — search index + ranking
Pagefind index built at deploy (`pagefind --site dist`). Indexing scope/weight is marked in `WikiPage.astro`. Result ranking weights primary entries (spheres, classes) above talents/feats (see V18).

### I.layout — page shell
`WikiPage.astro`: header + sidebar + tab nav + content slot; sets Pagefind indexing scope/weight per page. `Base.astro`: html shell, meta/OG tags, footer, self-hosted fonts + `global.css` load.

### I.class-family — class pages, features, traits
Class pages (`[class].astro`) render:
- **Class info block**: Alignment, Hit Die, Starting Wealth, Class Skills, Skill Ranks — each wrapped in `<span id="class-val-{key}">` for archetype override hot-swapping.
- **Progression table**: Dynamically generated level 1–20 grid. Columns: Level, BAB, Fort, Ref, Will, Special, Caster Level (computed from `casterTier`), Magic Talents (computed; level 1 shows `(+2)` bonus with tooltip), Spell Pool (`{level} + CAM` with tooltip). Extra class-specific columns from `classTable` JSON. CAM has a muted dotted-underline tooltip: "Casting Ability Modifier".
- **Class features**: `<h2>` heading with name, level badge, `|` separator, source-book label (`.talent-source`). Content rendered from markdown.
- **Class traits**: Rendered per-feature inside or outside a trait catalog toggle. Each trait uses `.talent-header` / `.talent-header-top` / `.talent-header-bottom` pattern matching talent page design: name + source on top row, tags (`TagBadge`) on bottom row. `class-trait` tag auto-injected by `buildOrderedTagIds()`.
- **Trait catalog**: For `isTraitContainer` features (e.g. Bestial Trait), a collapsible grid with toggle button. Open state adds a subtle background. Traits have a 3px `var(--clr-active)` left border. Prerequisites render as `**Prerequisites:**` line below the heading.
- **Trait detail pages** (`[trait].astro`): Full-page view for individual traits with breadcrumb, tag badges, source-book sidebar callout.

**Source attribution:** `*Source: Book*` lines in markdown bodies are stripped before rendering (`stripBodySource()`). Source is shown via metadata: `.talent-source` label on headings + `SourceBookCallout` in sidebar.

### I.archetype — inline archetype selector + ACFs
The archetype system runs entirely inline on the class page via TomSelect multi-select:
- **Selector**: Dropdown lists all archetypes for the class. Options show name + description excerpt. Selected archetypes are persisted in URL query params (`?archetypes=...`).
- **Compatibility**: `isCompatible()` checks replaces/alters/mutuallyExclusive fields. Incompatible selections are greyed out in the dropdown. Hard conflicts show a warning banner.
- **Hot-swap**: `updateArchetypes()` replaces feature cards, appends alteration blocks, inserts new features in level order, updates the progression table Special column (feature name → archetype feature name), and updates the ToC links — all client-side. Base state is stashed in `dataset.originalHtml` for clean restore.
- **Templates**: Each archetype feature generates an HTML5 `<template>` with compiled markdown body, `data-replaces`, `data-alters`, `data-level`, `data-class-overrides`. These are parsed into JS and applied on selection.
- **Class info overrides**: `classOverrides: Record<string, string>` on archetype features hot-swaps class header fields (Alignment, Hit Die, etc.) via the `class-val-*` span IDs.

**Alternate Class Features (ACFs):** Standalone class-feature swaps treated as individual virtual archetypes:
- ACFs are `type: archetype-feature` with `isAlternateClassFeature: true` and `archetypeId: {class}-alternate-class-features`.
- The class template auto-injects one virtual `ArchetypeEntry` per ACF — name prefixed "Alternate Class Feature:", description derived from `replaces` via feature name lookup. No content file needed for the parent.
- ACFs use `replaces` to specify the swapped feature. They plug into the same compatibility, hot-swap, and table/ToC update logic as regular archetypes.

### I.pages — route map (current + target)
```
/                              home
/power/                        power index
/power/[sphere]/               sphere detail
/power/[sphere]/[talent]/      talent detail
/power/[sphere]/feats/[feat]/  feat detail
/power/classes/[class]/        class detail (full — features, traits, progression table, inline archetype selector)
/power/classes/[class]/traits/[trait]/  trait detail (exists)
/power/using-spheres-of-power/ intro article (exists)
/power/casting-traditions/      rules article (exists)
/might/                        might index
/might/[sphere]/               sphere detail
/might/[sphere]/[talent]/      talent detail
/might/[sphere]/feats/[feat]/  feat detail
/might/classes/[class]/        class detail (MISSING — T1)
/might/using-spheres-of-might/ intro article (MISSING — T14)
/guile/                        guile index
/guile/[sphere]/               sphere detail
/guile/[sphere]/[talent]/      talent detail
/guile/[sphere]/feats/[feat]/  feat detail
/guile/classes/[class]/        class detail (MISSING — T2)
/guile/using-spheres-of-guile/ intro article (MISSING — T14)
/champions/                    champions index
/champions/[slug]/             class detail (stub — T11)
/champions/using-champions/    intro article (MISSING — T14)
/search/                       full search + filters
/tags/                         tag index
/tags/[tag]/                   tag detail
/store/                        book store
/about/                        about
/legal/                        OGL legal
/recent-changes/               changelog (stub — T10)
/contact/                      contact (MISSING — T7)
/archetypes/                   archetypes index (MISSING — T3)
/bb-code-template/             BB code template (MISSING — T4)
/community-resources/          community links (MISSING — T5)
/citations-guide/              citation guide (REMOVED)
/power/how-to-build-spherecaster/ guide (exists)
/power/how-to-build-champion/      guide (MISSING — T8)
/power/how-to-build-practitioner/    guide (MISSING — T8)
/guile/how-to-build-operative/       guide (MISSING — T8)
/preferences/                  preferences config page (stub — T40)
404                            custom 404 page (MISSING — T18)
```

---

## §P Placeholder Conventions

- Placeholder dates **must** use `1970-01-01` (Unix epoch / UTC 0) — never a "plausible" date like 2020-01-01. An obviously wrong date is immediately visible as a stub; a plausible one is silently wrong.
- Placeholder strings should be conspicuously fake (e.g. `"PLACEHOLDER"`, `"TBD"`). Do not guess real values.
- `publishedDate` in `_book.yaml` drives errata ordering (V21). A placeholder must never sort before a real date; `1970-01-01` safely predates all real content.

---

## §V Invariants

**Site / routing / config (V1–V14)**

- V1. Every internal `<a href>` must resolve to an existing route at build time — no 404s in nav, sidebar, or home resource links
- V2. Adding a book folder (`_book.yaml` + at least one `.md`) must require zero changes outside `src/content/` — content pipeline fully auto-discovers
- V3. Adding a sphere to an existing system (power/might/guile/champions) must automatically: appear on system index, generate detail page, appear in home RefCard sphere list, appear in search — with no component or page edits (icon SVG excepted per C6)
- V4. System accent color must be settable in exactly one place (`SYSTEMS` record in `site.ts`) and cascade to all UI — tab, page title, entry cards, section headers, source callout
- V5. `SYSTEMS` record in `site.ts` is single source of truth for system metadata — no parallel label/color/route lists elsewhere
- V6. All pages must pass `title` and `description` props to `Base.astro` — no page may use the generic default description
- V7. Search manifest must include all entry types for all systems defined in `SYSTEMS` — no system silently excluded
- V8. `si-fallback` symbol must exist in SVGSprite.astro — sphere icon lookup falls back to it rather than rendering broken SVG
- V9. Sidebar must contain zero dead links — any link not backed by a real route must be removed until that route exists
- V10. `global.css` must not contain repeated per-system accent rule blocks — system theming achieved via `--clr-ns` custom property set by `data-system` attribute
- V11. Zero external CDN requests on page load — no analytics, no remote fonts, no third-party scripts; all assets served from site domain
- V12. No analytics or tracking of any kind — no scripts that phone home, no fingerprinting, no pixel tracking
- V13. `/privacy/` page must exist, linked from site footer — must disclose: localStorage keys + purpose, GitHub Pages IP collection, third-party link disclaimer, contact email
- V14. Every `localStorage` write must have documented purpose and user-accessible deletion path — undocumented or infinite-retention keys are prohibited

**Content / schema / errata (V15–V25)**

- V15. All `.md` must match `entrySchema` in `src/content.config.ts`
- V16. `id` in frontmatter must match filename (without extension)
- V17. `sourceBook` must match the parent folder slug
- V18. Search results must prioritize spheres and classes over talents/feats
- V19. Every sphere icon referenced by an entry must exist in `SVGSprite.astro` (the `si-fallback` of V8 is a safety net, not a substitute)
- V20. Duplicate tag IDs are prohibited across all books
- V21. Errata patches (`modifies` field) applied in chronological order of books' `publishedDate` ascending
- V22. Errata patches do not change original `sourceBook` attribution
- V23. Errata patches do not leak `modifies` field onto resolved entry
- V24. Each entry claimed by first matching category definition. Entries sorted by `id` ascending
- V25. Interactive component initializations and event listeners must run on `astro:page-load` to support Astro View Transitions
- V26. `system:` frontmatter field ⊥ in entry `.md` files — must be derived from path `{book}/{system}` directory prefix
- V27. Core system book ! have `_system.yaml` at `{book}/{system}/` defining system metadata (id, name). Companion books (apocrypha, handbooks) ! NOT have `_system.yaml` — they contribute to the same system without redefining it.
- V28. `content.config.ts` auto-discovers `_system.yaml` to register systems in collection map
- V29. `inferFromPath` handles `{system}/spheres/{sphere}` 3-seg paths → `{type:sphere, id:sphere}`
- V30. Might export writes to `{content_root}/{source_book}/might/spheres/{sphere_id}/...` — system `might` in path, not frontmatter
- V31. Base abilities rendered via `[TalentName]` markers in sphere body — marker ID must match `tier:"base"` talent entry slug (lowercase kebab). `splitBodyOnMarkers()` extracts segments; page template matches against talentMap.
- V32. `sectionDefinitions` category with `tiers:["base"]` always empty — page template filters base talents before `buildSections()`. Base abilities render exclusively via V31 markers.
- V33. Prerequisites text auto-linked at build time: `**Prerequisites:**` block parsed; `<Name> Sphere|sphere` → sphere page link; parenthetical talent refs `(TalentName)` → talent page link iff talent exists in talentMap; non-talent parens (e.g. `(Any)`, `(formulae)`, `(toxin)`) left unlinked. Comma/"or"-separated multi-refs handled. Bare talent names (no sphere prefix) linked when found in talentMap. Case-insensitive matching of display names.
- V34. ∀ changes → npm run build ! pass. No change is considered complete unless the Astro site builds successfully without data or schema errors.
- V35. `coverImage` in `_book.yaml` must point to an existing local file in `src/assets/covers/` and cannot be a hotlink (URL).
- V36. All Might sphere conversions must pass `npm run build` — V34 applies to each sphere individually before marking COMPLETE.
- V37. Duplicate talent IDs (`type:sourceBook:id`) across different spheres must be manually disambiguated (e.g. `smash` → `smash-brute`). Original file path and display name stay unchanged.
- V38. Tags that exist in `ultimate-spheres-of-power` must NOT be redefined in Might — use the existing Power definition. Only create new Might tag files when no Power equivalent exists.

**Class family (V39–V44)**

- V39. `casterTier` on `ClassEntry` must be one of `"high" | "mid" | "low" | "none"` — drives computed Caster Level, Magic Talents, and Spell Pool columns in the progression table.
- V40. `class-trait` tag must be auto-injected by `buildOrderedTagIds()` for all `ClassTraitEntry` entries — no hardcoded label spans.
- V41. Class trait rendering must follow the talent design pattern: `.talent-header` > `.talent-header-top` (name + source) + `.talent-header-bottom` (TagBadge components).
- V42. `*Source: Book*` lines must be stripped from markdown bodies before rendering (`stripBodySource()`) — source attribution is shown via metadata labels and sidebar callouts, never inline in body text.
- V43. Prerequisites must render as `**Prerequisites:** {req}` on a separate line below the trait heading — never inline `(requires ...)` next to the name.
- V44. Class progression table headers must use `white-space: normal` + `overflow-wrap: break-word` for responsive wrapping. Table wrapper must have a slim custom scrollbar.

**Archetype system (V45–V47)**

- V45. Archetype features use `replaces` (string array of base feature IDs) and `alters` (string array) to specify what they modify. `mutuallyExclusive: true` (default) blocks stacking with other features that replace/alter the same base.
- V46. Alternate Class Features are `archetype-feature` entries with `isAlternateClassFeature: true`. They belong to a virtual archetype created at build time — no content file for the parent.
- V47. The archetype selector must persist selections in URL query params (`?archetypes=id1,id2`) and restore them on page load.

**Code architecture (V48–V53)**

- V48. Each route pattern must have exactly one source file — per-system pages use `[system]` dynamic routing, not separate `might/`, `power/`, `guile/` copies. No logical route may exist in triplicate.
- V49. Any rendering pattern shared across two or more pages must be extracted into a shared Astro component — inline duplication is prohibited once the pattern is identified.
- V50. CSS classes applied exclusively by client-side JavaScript must use `:global()` in Astro component styles — JS-injected DOM has no `data-astro-cid-*` attribute; component-scoped rules silently do not apply to it.
- V51. Class trait tag rendering must use the `TagBadge` component — no inline reimplementation of tag display logic on any page.
- V52. Archetype hot-swap must mutate existing DOM elements in-place rather than replacing container `innerHTML` on elements with Astro-scoped CSS class names — preserves `data-astro-cid-*` required for scoped styles to apply.
- V53. The `SYSTEMS` record in `src/config/site.ts` is the sole source of system metadata (id, label, color, route, cssKey, etc.) consumed by all routes and components — no parallel system label/color/route lists elsewhere in source.

**Content parity (V55–V59)**

- V55. Content parity — ∀ sphere page, old wiki talents+feats ⊆ new wiki talents+feats. Audit reports at `docs/audit-report-{power,might,guile}.md` are ground truth for gaps.
- V56. Base abilities + section headers + rules text ! render as talent-entry cards. `tier:"base"` items render via V31 markers; others as overview prose or rule blocks.
- V57. ∀ heading with valid `id` attr in page body → `data-toc-item` entry in sidebar TOC. No orphaned content.
- V58. Cross-sphere feats ! appear on ALL referenced sphere pages, not just one.
- V59. Entry slug IDs ! contain format artifacts (`993300`, hex color prefixes, etc.). Schema must reject at build time.

---

## §M Might Sphere Migration (Wikidot → Markdown)

### Pipeline

```
spheresofpower-wikidot-archive/pages/<sphere>.txt  (raw Wikidot source)
         │
         ▼
    ftml AST parser  (Rust crate: ftml/)
         │
         ▼
  export_might.rs   (per-sphere section_defs + sphere_entry functions)
         │
         ▼
  might-lexicon.toml  (citation_keys, apoc_body_sources, paren_tags, bracket_ability_tags)
         │
         ▼
spheres-wiki/src/content/<book>/might/spheres/<sphere>/*.md  (output)
```

### Key files

| File | Purpose |
|------|---------|
| `ftml/examples/export_might.rs` | Parser: `*_section_defs()` + `*_sphere_entry()` per sphere, wired in `main()` |
| `ftml/conf/might-lexicon.toml` | Ground-truth data dictionary: citation keys → book slugs, body-source titles → apoc slugs, paren tags, bracket ability tags |
| `ftml/examples/CLAUDE.md` | Workflow doc: 13-step per-sphere process, parser quirks, status table |
| `spheresofpower-wikidot-archive/pages/<sphere>.txt` | Raw Wikidot source per sphere |
| `spheresofpower-wikidot-archive/pages/pages/legal:start.txt` | Legal/OGL page — use to infer unknown citation keys (lists all published products) |

### Citation key resolution

| Sentinel | Behavior |
|----------|----------|
| `__DEFERRED__` | Two-step: check body `^^Source:^^` line against `[apoc_body_sources]`. No match → quarantine. Used for `[Apoc]`, `[DRS]`, `[SM—]`. |
| `__SKIP__` | Silently discard entry. Used for `[3PP]` (3rd-party, handled by live wiki). |
| `<book-slug>` | Direct mapping to source book folder. |

### Publisher indicators (deferred keys)

| Key | Publisher | Resolution |
|-----|-----------|------------|
| `[Apoc]` | Spheres Apocrypha (various) | Body source → specific apoc book slug |
| `[DRS]` | Diamond Recreational Studios | Body source → specific DRS book slug |
| `[SM—]` | Studio M— (em dash U+2014) | Body source → Baron's book slug |

### Known collision fixes

| Original ID | Disambiguated | Spheres |
|-------------|---------------|---------|
| `smash` | `smash-brute` | Barroom + Brute |
| `essence-manipulation` | `essence-manipulation-duelist` | Blood (Power) + Duelist |
| `turbo-sweep` | `turbo-sweep-guardian` | Athletics + Guardian |
| `turbo-knockdown` | `turbo-knockdown-lancer` | Athletics + Lancer |

### Tags shared with Power (DO NOT redefine in Might)

`utility`, `bleed`, `boast`, `exploit`, `slam` — defined in `ultimate-spheres-of-power`, reused by Might entries. Only create new Might tag files when no Power equivalent exists.

### Accent normalization

`slugify()` in `export_might.rs` maps common accented Latin chars to ASCII: `á→a`, `é→e`, `í→i`, `ñ→n`, `ç→c`, `ý→y`. Required because Astro schema enforces `^[a-z0-9-]+$` for IDs.

---

## §T Tasks

| id  | status | description                                              | cites         |
|-----|--------|----------------------------------------------------------|---------------|
| T1  | x      | Create `/might/classes/[class].astro` (port power template, no archetypes) | V1,V3,I.pages |
| T2  | x      | Create `/guile/classes/[class].astro` (port power template, no archetypes) | V1,V3,I.pages |
| T3  | x      | Create `/archetypes/` index page — two sections: (1) Sphere Class Archetypes grouped by system→class, color-coded, collapsible; (2) PF1e Archetypes grouped by base class, "Spheres {Class}" always first, arc system badge colored. Links only to routes that exist. | V1,V9,I.pages,I.content |
| T4  | x      | Enhance `/tags/` index — add per-tag entry counts, system breakdown badges, sort by count/alpha; update home ResourceCard from bb-code-template → tags | V1,V3,I.pages |
| T5  | x      | Create `/community-resources/` page                      | V1,I.pages    |
| T6  | -      | ~~Create `/citations-guide/` page~~ — removed            | V1,I.pages    |
| T7  | x      | Create `/contact/` page                                  | V1,I.pages    |
| T8  | ~      | Create `/power/how-to-build-*` guide pages (Spherecaster done; 2 remaining) | V1,I.pages    |
| T9  | x      | Remove/fix all dead sidebar links (Other Systems block, subsection stubs) | V1,V9 |
| T10 | .      | Implement `/recent-changes/` with real content (git-log or manual changelog) | V1,I.pages |
| T11 | .      | Wire champion class body + features into `/champions/[slug]` | V1,I.pages |
| T12 | .      | Wire might/guile index card descriptions (currently "wired in R1-6" stubs) | V3 |
| T13 | .      | Add ErrataNotice to sphere/talent detail pages           | V1            |
| T14 | .      | Create using-spheres intro pages for might, guile, champions | V1,I.pages |
| T15 | x      | Create article page route — `ArticlePage.astro` renderer + thin per-article page pattern (first entry: USoP `using-spheres-of-power`) | V3,I.content  |
| T16 | x      | Consolidate `site.ts` into single `SYSTEMS` record; delete NAMESPACE_COLORS, NAMESPACE_LABELS, TAB_ORDER | V4,V5,I.config |
| T17 | x      | Refactor `global.css` accent rules to use `--clr-ns` custom property via `data-system` attribute | V4,V10 |
| T18 | x      | Drive TabNav from SYSTEMS config; derive currentTab() from route field | V5,I.config |
| T19 | x      | Derive `search/index.astro` SYSTEM_META from SYSTEMS config | V5,V7,I.config |
| T20 | x      | Refactor RefCard — delete nsConfigs, read subtitle/classLabel/route from SYSTEMS | V5,I.config |
| T21 | x      | Refactor `pages/index.astro` home RefCards to loop over SYSTEMS | V3,V5,I.config |
| T22 | x      | Move IntroCard meta record to SYSTEMS config             | V5,I.config   |
| T23 | .      | Add `si-fallback` symbol to SVGSprite.astro; guard icon lookup in sphere templates | V8,I.svg |
| T24 | .      | Add `@astrojs/sitemap` integration                       | I.pages       |
| T25 | .      | Create custom `404.astro` page                           | V1,I.pages    |
| T26 | .      | Add OG/social meta tags to Base.astro (og:title, og:image, og:description, twitter:card, canonical) | V6 |
| T27 | .      | Pass per-page `description` from all detail pages to Base.astro | V6 |
| T28 | .      | Add `@media print` stylesheet block to global.css        |               |
| T29 | .      | Add dark mode toggle with CSS `[data-theme="dark"]` vars and localStorage persistence | |
| T30 | .      | Add localStorage dismiss to BetaToast component          |               |
| T31 | .      | Add JSON-LD breadcrumb structured data to detail pages   | V6            |
| T32 | .      | Add RSS feed route (`/rss.xml`)                          |               |
| T33 | x      | Self-host fonts — install `@fontsource/cinzel` + `@fontsource/crimson-text`, import in Base.astro, delete `fonts.googleapis.com` link; remove all Umami analytics scripts | V11,V12 |
| T34 | x      | Write `/privacy/` page — localStorage keys, GitHub Pages IP collection, third-party link disclaimer, contact email | V13 |
| T35 | x      | Add site footer to Base.astro — links: Privacy, Legal (OGL), Contact; appears on all pages | V13,I.pages |
| T36 | x      | Add `public/robots.txt` — allow all crawlers, link sitemap | I.pages |
| T37 | x      | Add meta http-equiv security headers — `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` (GitHub Pages limitation: true response headers require Cloudflare/Netlify) | |
| T38 | x      | Document `localStorage` key inventory in code comment at BetaToast.astro — key name, purpose, retention, deletion path | V14 |
| T39 | .      | Add content version selector (Original/Ultimate/Polished) with thematically appropriate design. Hover effects explain categories. Gray out/disable if content missing. Hide 'Ultimate' entirely for non-'power' systems. | |
| T40 | .      | Create a "config" page that allows the user to filter out specific content site-wide (e.g. hiding all third-party content, hiding "April Fools" content) and save these preferences. | |
| T41 | .      | Tag system — resolve 17 multi-sphere tags: assign to primary sphere or leave cross-sphere. Candidates: `admixture` (dest/mana/nature), `air` (dest/nature), `cold` (dest/weather), `fire` (dest/nature), `companion` (alt/conj/mana), `counterspell` (dest/enh/mind), `curse` (death/fate/mana), `light` (dest/light), `metamagic` (fate/ill/warp), `all` (warp/weather), `auxiliary` (dark/div/prot), `champion` (fey/warp), `ghost-strike` (death/fate), `manipulation` (mana/prot), `program` (death/mana/prot), `teamwork` (death/light/weather). | I.content |
| T42 | .      | Tag system — audit 16 unused tags (defined but not applied to any entry): `background`, `bleed`, `boast`, `cohort`, `equipment`, `item-creation`, `ki-blaster`, `leap`, `legendary`, `minor-artifact`, `mutation`, `potent`, `racial`, `ritual`, `slam`, `stance`. Assign sphere where clear; move cross-sphere ones to `__built-in__`; delete if genuinely obsolete. | I.content |
| T43 | .      | Tag system — show sphere link on `/tags/[tag]/` detail page when `tag.sphere` is set. | I.pages |
| T44 | x      | Audit entire website for any possible Flash of Unstyled Content (FOUC) and resolve by removing remote scripts/CSS in favor of local bundling | V11 |
| T45 | x      | Audit all `src/content` for V15/V16/V17 compliance       | V15,V16,V17 |
| T46 | x      | Verify `SVGSprite.astro` has all icons named in `src/content/**/*.md` | V19 |
| T47 | x      | Implement ranking weights in Pagefind for V18            | V18,I.pagefind |
| T48 | x      | Add validation script for V16 consistency check          | V16           |
| T49 | x      | Fix mismatch between test expectation ('feats') and implementation ('general-feats') in categorize.test.ts | I.categorize |
| T50 | x      | Wrap search bar initialization in SiteHeader.astro in an `astro:page-load` event listener | V25 |
| T51 | x      | Create `_system.yaml` at `src/content/spheres-of-might/might/_system.yaml` — id:might, name:Spheres of Might | V27,V30 |
| T52 | x      | Remove `system:` frontmatter from all Might Alchemy entries (93 files) — system derived from `might/` dir prefix | V26,V30 |
| T53 | x      | Refactor `export_might.rs` to write paths `{content_root}/{source_book}/might/spheres/{sphere_id}/...`; remove `MightEntry.system`; add `ensure_system_def` | V26,V27,V30 |
| T54 | .      | Migrate Power `ultimate-spheres-of-power` content to `power/` subdirectory; strip `system: power` from all entries | V26 |
| T55 | .      | Migrate companion-book Power content to `{book}/power/` subdirs; strip `system: power` | V26 |
| T56 | .      | Update `content.config.ts` to auto-discover `_system.yaml` — register systems in collection map; remove `system` from entry `baseFields` (now optional path-derived) | V27,V28 |
| T57 | x      | Might Alchemy validation — force-write to correct dirs + `--validate` compare pass (0 diffs); verify `inferFromPath` 3-seg sphere paths | V29,V30 |
| T58 | .      | Upgrade `export_might.rs` — auto-generate `[TalentName]` markers in sphere body for tier:base entries; derive marker names from base-ability slugs | V31,V32 |
| T59 | x      | Auto-link prerequisites text — parse `**Prerequisites:**` blocks in body markdown (remark plugin), link sphere names + parenthetical talent refs, skip non-talent qualifiers like `(Any)` | V33,I.resolveEntries |
| T60 | x      | Generalize `/power/` index page design to `/might/`, `/guile/`, and `/champions/`. Retain individual section designs where needed, but reuse the general layout without regressions. | I.pages |
| T61 | .      | Extract `ClassProgressionTable` component — 80-line level-grid table + CSS out of `[class].astro` into shared component; accepts `cls`, `featuresByLevel`, and `tableRows` props | V48,V49,I.class-family |
| T62 | .      | Extract `TraitCatalogSection` component — collapsible trait toggle + catalog grid out of `[class].astro` into shared component | V48,V49,I.class-family |
| T63 | .      | Extract `ClassFeatureBlock` component — h2 heading with name/level/sep/sourcebook + entry-description into shared component; must receive and propagate Astro scoped CSS | V48,V49,I.class-family |
| T64 | .      | Extract `ArchetypeSwapper` as standalone component — TomSelect multi-select, conflict detection, replaced/altered hot-swap, table + ToC updates, all archetype-injection CSS; exposes data via props + script slot | V48,V49,V50,I.archetype |
| T65 | .      | Unify `[system]/classes/[class].astro` — collapse might/power/guile copies into single `src/pages/[system]/classes/[class].astro`; use SYSTEMS registry for all system-specific strings | V48,V53,T61,T62,T63,T64 |
| T66 | .      | Unify `[system]/classes/[class]/[archetype].astro` — collapse 3 copies into single dynamic route | V48,V53,T63 |
| T67 | .      | Unify `[system]/classes/[class]/traits/[trait].astro` — collapse 3 copies | V48,V53 |
| T68 | .      | Unify `[system]/[sphere]/index.astro` — collapse 3 copies | V48,V53 |
| T69 | .      | Unify `[system]/[sphere]/[talent].astro` — collapse 3 copies | V48,V53 |
| T70 | .      | Unify `[system]/[sphere]/feats/[feat].astro` — collapse 3 copies | V48,V53 |
| T71 | .      | Unify `[system]/index.astro` — collapse 3 copies | V48,V53 |
| T72 | .      | Audit all pages for inline TagBadge reimplementation — replace with TagBadge component | V49,V51 |
| T73 | .      | Author 2 missing Power sphere pages from old wiki source: Bear, Technomancy | V1,V55,I.pages |
| T74 | .      | Author 7 missing Power talents: Death/Curse, Mana/Bulwark, Mind/Disrupt Focus+Polyglot, Telekinesis/Flight, War/Commander, Fallen Fey/Ventriloquism | V55 |
| T75 | .      | Author 20 missing Power feats — see `docs/audit-report-power.md` §Missing Feats | V55,V58 |
| T76 | .      | Fix 73 Power categorization errors — re-tag items as base abilities/section headers/rules text; remove talent-entry card rendering | V56 |
| T77 | .      | Fix Martial Companion slug: `993300martial-companion` → `martial-companion` | V59 |
| T78 | .      | Add About Dreamscapes appendix text to Mind sphere page | V55 |
| T79 | .      | Add Grimalkin Shade to Fallen Fey TOC sidebar (present in body, missing data-toc-item) | V57 |
| T80 | .      | Shield: author 9 missing talents + Note: Shields and Shield Bonuses overview from old wiki source | V55 |
| T81 | .      | Equipment: author 8 missing talents from old wiki source | V55 |
| T82 | .      | Leadership: author 9 missing overview sections (Wealth, Building Cohort, Dividing Followers, Re-Recruiting, Roleplaying Cohorts, Roleplaying Followers, Followers And Statistics, Party Followers, Toolbox) | V55 |
| T83 | .      | Wrestling: author 4 missing talents + Practitioner Unarmed Damage table | V55 |
| T84 | .      | Gladiator: author 4 missing demoralization talents (Booming Roar, Dullahan's Call, Hear Their Screams, Ominous Presence) | V55 |
| T85 | .      | Trap: author 3 missing talents (Scatter Trap, Trap Door, Well-Planned Surprise) | V55 |
| T86 | .      | Brute: author 2 missing talents (Momentous Force, Underfoot Trample) | V55 |
| T87 | .      | Single-talent gaps — author 1 talent each for Athletics/Mobility, Berserker/Deathless, Dual Wielding/Underhanded Blades, Duelist/Ruthless Opportunist, Fencing/Shadow Strike, Open Hand/Rapid Sweep, Scoundrel/Snatching Dash, Scout/Honed Sense, Warleader/Dispiriting Roar | V55 |
| T88 | .      | Author missing Might overview sections: Athletics Packages+Types, Barroom Improvised Weapon Damage, Beastmastery Packages, Scoundrel Swift Hands | V55 |
| T89 | .      | Add 8 TOC-invisible items to sidebar: Alchemy/Note: Crafting Alchemical Items, Guardian/Punishment, Open Hand/Sweep, Scoundrel/Marked Target, Shield/Active Defense, Sniper/Deadly Shot, Navigation/Cartographer+Pointer | V57 |
| T90 | .      | Add Unarmed Combatants overview sections to Boxing, Brute, Open Hand, Wrestling sphere pages | V55 |
| T91 | .      | Add Practitioner Unarmed Damage table to Wrestling sphere page | V55 |
| T92 | .      | Author 5 missing Guile talents: Navigation/Focused Wayfaring+Heedless Advance+Tracker, Subterfuge/Veil of Mystery, Vocation/Crowd Pleaser | V55 |
| T93 | .      | Copy 3 cross-sphere feats to secondary pages: Grandiose Charms→Bluster, Detailed Charting→Investigation, Speculative Analysis→Study | V58 |
| T94 | .      | Author 25 missing Guile overview sections: Talent Types for 12 spheres + package descriptions for Artifice, Faction, Herbalism, Performance, Survivalism | V55 |
| T95 | .      | Fix 3 Guile categorization errors: re-tag Authoritative (Bluster) + Exceptional Discipline (Body Control) as base abilities, not talent cards | V56 |
| T96 | .      | Add 5 TOC-invisible items to sidebar: Navigation/Cartographer+Pointer, Artifice/Tug The Heartstrings+Drawbacks, Faction/Resource Budgets+Retainer Statistics | V57 |
| T97 | .      | Add Optional Detailed Statistics table to Faction sphere page | V55 |
| T98 | .      | Add 5 missing rule notes/sidebars: Spellhacking/Dispel Checks+Hacking Instrument, Faction/New and Old Factions+Authority and Responsibility, Performance/Ally Coordination | V55 |
| T99 | .      | Cross-system completeness verification — re-run full audit after T73-T98; confirm 0 genuine gaps across all 64 spheres | V55 |
| T100 | .      | Add slug validation script — reject hex-prefix slugs (`^993300`, color codes) at schema or build-check level | V59 |
| T101 | .      | Add TOC audit script — detect page-body headings with `id` attr missing from `data-toc-item` sidebar entries | V57 |
| T102 | .      | Add cross-sphere feat audit script — detect feats present on 1 sphere page but absent from another that references them | V58 |
| T103 | .      | Normalize `tier:"base"` → `[TalentName]` marker generation in Might export pipeline; verify all base abilities render via V31 markers | V31,V32,V56 |
| T104 | .      | Unify dual-sphere: eliminate `dual-sphere` tag/`dualSphere` duplication. `dualSphere` field = single source of truth. Tag auto-derived by tags.ts. Support `dualSphere:"any"` for universal pairing (Manabond Versatility). See `docs/cavekit-dual-sphere-refactor.md` | V58 |
| T105 | .      | Create generalized `TabbedContent.astro` component — supports rendering content from `.md` entries (via `render()`) OR custom `.astro` content via named slots. Reusable across the wiki. | V48,V49 |
| T106 | .      | Define custom schemas for `drawback`, `boon`, and `tradition` entries in `src/content.config.ts`. | I.content |
| T107 | .      | Implement interactive Casting Tradition Builder component — cost calculation, validation, and export (Markdown/Foundry). | I.layout |

**Recommended build order:**
Refactor batch (T16→T17→T18→T19→T20→T21→T22) first — single cohesive session, no user-visible change.
Then broken routes (T1→T2→T9→T25→T3→T4→T5→T6→T7→T8).
Then stubs (T11→T12→T13→T14→T15→T10).
Then infra (T23→T24→T26→T27→T28→T29→T30→T31→T32).
**Privacy/compliance batch (do before any significant traffic):** T35→T36→T37→T38.
  - T33+T34 already done
  - T35 (footer) links to /privacy/ which exists; build first

**Content parity remediation (T73–T103) — see `docs/audit-report-*.md`:**
1. Systemic safeguards: T100→T101→T102→T103 (prevent recurrence)
2. Guile (smallest gap, fastest win): T92→T93→T94→T95→T96→T97→T98
3. Power categorization (needs 0 new content): T76→T77
4. Power content: T73→T74→T75→T78→T79
5. Might (largest — sphere-by-sphere worst→best): T80→T81→T82→T83→T84→T85→T86→T87→T88→T89→T90→T91
6. Verification: T99 (re-audit all 64 spheres → confirm 0 gaps)
7. Refactor: T104 (unify dual-sphere into dualSphere field)

Tasks T44–T50 carried from the legacy AGENTS.md spec: T45–T50 done; **T44 (FOUC audit) still open.**

---

## §B Bugs

| id | date       | cause | fix |
|----|------------|-------|-----|
| B1 | 2026-05-25 | Search listeners lost on back/forward navigation due to View Transitions swapped DOM | V25 / T50 — init moved to `astro:page-load` |
| B2 | 2026-05-25 | Archetype selector visuals are unfinished | Resolved — TomSelect integrated with custom styling, archetype badges, warning banner, table/ToC updates |
| B3 | 2026-05-25 | Bestial traits dropdown logic completely broken due to CSS grid refactor | Resolved — grid-template-rows animation, toggle rebinding on archetype swap, visual distinction from features |
| B4 | 2026-05-29 | `parseSectionContext` used `includes('feat')` — matched "features" in "+++ Companion Features", premature-flushed base ability and reset section context | Changed to `/\bfeats?\b/` |
| B5 | 2026-06-03 | "SM-" tag needs to be removed from codebase | Resolved |
| B6 | 2026-06-03 | z-index issue on tags page: tags appear on top of search bar results/dropdown | Added `position: relative` and `z-index: 9999` to `.site-header-wrap` |
| B7 | 2026-06-06 | `sectionDefinitions` duplicated section label as category label → duplicate HTML `id` attrs → TOC scroll broken, sections empty | V31 — unique labels; one "Talents" section groups categories |
| B8 | 2026-06-06 | Base abilities not rendering — `[TalentName]` markers missing from sphere body; `tier:"base"` `sectionDefinitions` category always empty (filtered before `buildSections`) | V31,V32 — markers in body + remove useless base category |
| B9 | 2026-06-06 | `export_might.rs` body converter: `----` → `---` without blank line → setext heading `<h2>` rendering | fix: `wikidot_lines_to_markdown` inserts blank line before `---` |
| B10 | 2026-06-14 | Martial Companion slug corrupted: hex color `993300` leaked from parser into `id` | V59 / T77 |
| B11 | 2026-06-14 | Cross-sphere feats present on 1 page, missing from other sphere pages they belong to | V58 / T75,T93,T102 |
| B12 | 2026-06-14 | 73 Power entries miscategorized as talent cards — should be base abilities, section headers, or rules text | V56 / T76 |
| B13 | 2026-06-14 | 18 items across 3 systems present in page body but invisible in TOC sidebar (no data-toc-item) | V57 / T79,T89,T96,T101 |
| B14 | 2026-06-14 | Parser `data-toc-section` mismatch: combat feats in `combat-feats` section undetected by diff tool | parser fix / low-priority |
| B15 | 2026-06-14 | Old wiki `<h5>` sub-sections auto-flagged as missing standalone talents by diff tool | parser fix / low-priority |
| B16 | 2026-06-14 | Duplicate `type:id` entries in different books silently overwrite by `publishedDate` order in `resolveEntries.ts` — stale copies in older books could overwrite correct entries if date ordering reversed | Delete stale duplicates (done for 4 gladiator talents in `spheres-of-might/`); `check-dir-truth.mjs` prevents re-introduction |
| B17 | 2026-06-16 | Visual formatting delayed on page load — layout snaps ~1s after navigation. Traced to `accessibility` npm package polling `getVoices()` every 9ms in a failing loop, throwing errors 111/sec and saturating the task queue. Blocked first paint until mouse move triggered refresh driver | Removed `accessibility` package from `Base.astro` + `npm uninstall accessibility`. Site is semantic HTML — no JS overlay needed |
