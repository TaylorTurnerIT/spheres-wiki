# SPEC — Spheres Wiki

## §G Goal

Fast static wiki for Spheres tabletop RPG (Power/Might/Guile/Champions). Content-first: adding new book/sphere/talent requires only markdown+yaml files, no code changes. Deployed GitHub Pages `/spheres-wiki/`.

---

## §C Constraints

- C1. Static site only — Astro SSG, no server runtime
- C2. GitHub Pages deploy — base path `/spheres-wiki/`, all URLs via `url()` helper
- C3. Content auto-discovered — new book folder (`_book.yaml` + `.md`) requires zero code registration
- C4. Search client-side only — Pagefind index built at deploy time
- C5. OGL compliance — all content under Open Game License; legal page must exist
- C6. New sphere in existing system must appear site-wide with only content files added (no component edits) — except icon SVG which requires one `<symbol>` addition to SVGSprite.astro
- C7. New game system requires coordinated changes across config, CSS, nav, pages — this is acceptable but must be documented in §I

---

## §I Interfaces / External Surfaces

### I.content — book folder contract
```
src/content/<book-slug>/
  _book.yaml          # title, publisher, publishedDate, price?, buyUrl?, coverImage?
  **/*.md             # frontmatter validated by entrySchema (content.config.ts)
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

### I.pages — route map (current + target)
```
/                              home
/power/                        power index
/power/[sphere]/               sphere detail
/power/[sphere]/[talent]/      talent detail
/power/[sphere]/feats/[feat]/  feat detail
/power/classes/[class]/        class detail (full — features, traits, archetypes)
/power/classes/[class]/[arch]/ archetype detail
/power/classes/[class]/traits/[trait]/  trait detail
/power/using-spheres-of-power/ intro article (exists)
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
/citations-guide/              citation guide (MISSING — T6)
/how-to-build-champion/        guide (MISSING — T8)
/how-to-build-practitioner/    guide (MISSING — T8)
/how-to-build-spherecaster/    guide (MISSING — T8)
404                            custom 404 page (MISSING — T18)
```

---

## §V Invariants

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

---

## §T Tasks

| id  | status | description                                              | cites         |
|-----|--------|----------------------------------------------------------|---------------|
| T1  | x      | Create `/might/classes/[class].astro` (port power template, no archetypes) | V1,V3,I.pages |
| T2  | x      | Create `/guile/classes/[class].astro` (port power template, no archetypes) | V1,V3,I.pages |
| T3  | x      | Create `/archetypes/` index page — two sections: (1) Sphere Class Archetypes grouped by system→class, color-coded, collapsible; (2) PF1e Archetypes grouped by base class, "Spheres {Class}" always first, arc system badge colored. Links only to routes that exist. | V1,V9,I.pages,I.content |
| T4  | .      | Create `/bb-code-template/` page                         | V1,I.pages    |
| T5  | .      | Create `/community-resources/` page                      | V1,I.pages    |
| T6  | .      | Create `/citations-guide/` page                          | V1,I.pages    |
| T7  | .      | Create `/contact/` page                                  | V1,I.pages    |
| T8  | .      | Create `/how-to-build-*` guide pages (3 pages)           | V1,I.pages    |
| T9  | .      | Remove/fix all dead sidebar links (Other Systems block, subsection stubs) | V1,V9 |
| T10 | .      | Implement `/recent-changes/` with real content (git-log or manual changelog) | V1,I.pages |
| T11 | .      | Wire champion class body + features into `/champions/[slug]` | V1,I.pages |
| T12 | .      | Wire might/guile index card descriptions (currently "wired in R1-6" stubs) | V3 |
| T13 | .      | Add ErrataNotice to sphere/talent detail pages           | V1            |
| T14 | .      | Create using-spheres intro pages for might, guile, champions | V1,I.pages |
| T15 | .      | Create article page route (ArticleEntry has no renderer) | V3,I.content  |
| T16 | .      | Consolidate `site.ts` into single `SYSTEMS` record; delete NAMESPACE_COLORS, NAMESPACE_LABELS, TAB_ORDER | V4,V5,I.config |
| T17 | .      | Refactor `global.css` accent rules to use `--clr-ns` custom property via `data-system` attribute | V4,V10 |
| T18 | .      | Drive TabNav from SYSTEMS config; derive currentTab() from route field | V5,I.config |
| T19 | .      | Derive `search/index.astro` SYSTEM_META from SYSTEMS config | V5,V7,I.config |
| T20 | .      | Refactor RefCard — delete nsConfigs, read subtitle/classLabel/route from SYSTEMS | V5,I.config |
| T21 | .      | Refactor `pages/index.astro` home RefCards to loop over SYSTEMS | V3,V5,I.config |
| T22 | .      | Move IntroCard meta record to SYSTEMS config             | V5,I.config   |
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

**Recommended build order:**
Refactor batch (T16→T17→T18→T19→T20→T21→T22) first — single cohesive session, no user-visible change.
Then broken routes (T1→T2→T9→T25→T3→T4→T5→T6→T7→T8).
Then stubs (T11→T12→T13→T14→T15→T10).
Then infra (T23→T24→T26→T27→T28→T29→T30→T31→T32).

---

## §B Bugs

| id | date | cause | fix |
|----|------|-------|-----|
