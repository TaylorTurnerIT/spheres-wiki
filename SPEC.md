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
- C8. Toolchain pinned — Astro 6.x SSG + TypeScript, Node.js ≥ 22.12.0
- C9. Entry metadata is path-encoded — `src/content/<book>/<type>/*.md`; `type` (and sphere/feats nesting) inferred from path by `inferFromPath` (see I.content), so frontmatter stays minimal
- C10. All entry `id`s are lowercase kebab-case (`^[a-z0-9-]+$`), enforced by `entrySchema`

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

### I.categorize — section builder
`src/lib/categorize.ts`: groups a sphere's talents/feats into display sections from the sphere's `categoryDefinitions`/`sectionDefinitions`. Unmatched entries fall into an "Other" catch-all. Each entry is claimed by the first matching category (see V24).

### I.pagefind — search index + ranking
Pagefind index built at deploy (`pagefind --site dist`). Indexing scope/weight is marked in `WikiPage.astro`. Result ranking weights primary entries (spheres, classes) above talents/feats (see V18).

### I.layout — page shell
`WikiPage.astro`: header + sidebar + tab nav + content slot; sets Pagefind indexing scope/weight per page. `Base.astro`: html shell, meta/OG tags, footer, self-hosted fonts + `global.css` load.

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
/citations-guide/              citation guide (REMOVED)
/how-to-build-champion/        guide (MISSING — T8)
/how-to-build-practitioner/    guide (MISSING — T8)
/how-to-build-spherecaster/    guide (MISSING — T8)
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
| T8  | .      | Create `/how-to-build-*` guide pages (3 pages)           | V1,I.pages    |
| T9  | .      | Remove/fix all dead sidebar links (Other Systems block, subsection stubs) | V1,V9 |
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
| T44 | .      | Audit entire website for any possible Flash of Unstyled Content (FOUC) and resolve by removing remote scripts/CSS in favor of local bundling | V11 |
| T45 | x      | Audit all `src/content` for V15/V16/V17 compliance       | V15,V16,V17 |
| T46 | x      | Verify `SVGSprite.astro` has all icons named in `src/content/**/*.md` | V19 |
| T47 | x      | Implement ranking weights in Pagefind for V18            | V18,I.pagefind |
| T48 | x      | Add validation script for V16 consistency check          | V16           |
| T49 | x      | Fix mismatch between test expectation ('feats') and implementation ('general-feats') in categorize.test.ts | I.categorize |
| T50 | x      | Wrap search bar initialization in SiteHeader.astro in an `astro:page-load` event listener | V25 |

**Recommended build order:**
Refactor batch (T16→T17→T18→T19→T20→T21→T22) first — single cohesive session, no user-visible change.
Then broken routes (T1→T2→T9→T25→T3→T4→T5→T6→T7→T8).
Then stubs (T11→T12→T13→T14→T15→T10).
Then infra (T23→T24→T26→T27→T28→T29→T30→T31→T32).
**Privacy/compliance batch (do before any significant traffic):** T35→T36→T37→T38.
  - T33+T34 already done
  - T35 (footer) links to /privacy/ which exists; build first

Tasks T44–T50 carried from the legacy AGENTS.md spec: T45–T50 done; **T44 (FOUC audit) still open.**

---

## §B Bugs

| id | date       | cause | fix |
|----|------------|-------|-----|
| B1 | 2026-05-25 | Search listeners lost on back/forward navigation due to View Transitions swapped DOM | V25 / T50 — init moved to `astro:page-load` |
| B2 | 2026-05-25 | Archetype selector visuals are unfinished | _(open)_ |
| B3 | 2026-05-25 | Bestial traits dropdown logic completely broken due to CSS grid refactor | _(open)_ |
| B4 | 2026-05-29 | `parseSectionContext` used `includes('feat')` — matched "features" in "+++ Companion Features", premature-flushed base ability and reset section context | Changed to `/\bfeats?\b/` |
| B5 | 2026-06-03 | "SM-" tag needs to be removed from codebase | Resolved |
| B6 | 2026-06-03 | z-index issue on tags page: tags appear on top of search bar results/dropdown | Added `position: relative` and `z-index: 9999` to `.site-header-wrap` |
