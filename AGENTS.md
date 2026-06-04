# AGENTS.md — Spheres Wiki

Orientation for AI agents and new contributors working in this repo. This file explains **how the project is laid out and how to work in it**. For **what the project must do** — goal, constraints, interface contracts, invariants, the task backlog, and the bug log — read [`SPEC.md`](./SPEC.md), which is the source of truth. When code and SPEC.md disagree, that is a bug to reconcile.

## What this is

A fast, static reference wiki for the **Spheres** tabletop RPG system (by Drop Dead Studios), replacing the legacy Wikidot site. It is **content-first**: nearly all game data lives as markdown + yaml under `src/content/`, and the site auto-discovers it — adding a book, sphere, or talent normally requires no code changes.

The four player-facing systems are **Power**, **Might**, **Guile**, and **Champions**. Pathfinder 1e base classes (`system: "pf1e"`) exist only as carriers for sphere archetypes and never appear on system index pages.

## Tech stack

- **Astro 6.x** static site generator + **TypeScript** (no server runtime)
- **Pagefind** for client-side search (index built at deploy)
- **TomSelect** for select/dropdown UI; vanilla CSS (`src/styles/global.css`), no framework
- Self-hosted fonts via `@fontsource/cinzel` + `@fontsource/crimson-text` — **no external CDN, no analytics** (see SPEC V11/V12)
- **Node.js ≥ 22.12.0**
- Deployed to **GitHub Pages** at base path `/spheres-wiki/` (`astro.config.mjs`)

> Note: `README.md` still says "Astro 4.x" — stale; the real version is 6.x per `package.json`.

## Commands

```bash
npm install            # setup
npm run dev            # dev server → http://localhost:4321
npm run build          # validate.mjs → astro build → pagefind index (output: dist/)
npm run preview        # serve the production build locally
npm run validate       # content validation only (scripts/validate.mjs)
npm test               # unit tests (Vitest)
npm run test:e2e       # end-to-end tests (Playwright)
npm run test:all       # vitest + playwright
npx astro check        # type check
```

`just` wraps the common ones: `just run` (the default) = `test → validate → build → preview`; also `just test`, `just validate`, `just build`, `just preview`.

CI (`.github/workflows/`): `test.yml` runs Vitest + content validation on push/PR (Playwright e2e is currently commented out); `deploy.yml` builds and publishes to GitHub Pages on push to `main`.

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
  e2e/                Playwright tests (routes, a11y, search, meta, performance, ...)
public/               static passthrough (robots.txt, etc.)
docs/                 supporting docs
```

## Content model (read this before touching content)

Books are **auto-discovered**: a folder under `src/content/` is registered as a collection iff it has both a `_book.yaml` **and** at least one `.md` entry (`content.config.ts`). No manual registration anywhere.

```
src/content/<book-slug>/
  _book.yaml          # title, publisher, publishedDate, system?, price?, buyUrl?, coverImage?
  spheres/<id>.md
  feats/<id>.md
  classes/<id>.md
  ...                 # entry type is inferred from the path by lib/inferFromPath.ts
```

Entry types (discriminated union on `type` in `entrySchema`): `sphere`, `talent`, `feat`, `class`, `class-feature`, `class-trait`, `article`, `archetype`, `archetype-feature`, `tag`.

Frontmatter is intentionally minimal because `inferFromPath` fills in `type`/`sphere`/`system` from the file's location. Example talent:

```yaml
---
id: my-talent          # lowercase kebab-case, must equal the filename (SPEC V16)
name: My Talent
system: power
sphere: alteration
tier: basic
tags: ["transformation", "utility"]
---
Talent body in markdown. Internal links resolve via the remarkEntryLinks plugin.
```

Special cases:
- **`__built-in__/`** — house book holding cross-sphere / system tags (`type: tag`).
- **Errata / patches** — an entry with a `modifies` field overrides another; patches apply in `publishedDate` order and must not alter the original `sourceBook` (SPEC V21–V23).
- **PF1e classes** — `system: "pf1e"`; their archetypes carry the sphere system they grant; `"Spheres {Class}"` archetype sorts first (SPEC §I.content).

Adding content the supported way:
- **New book** → create the folder + `_book.yaml` + one `.md`. Nothing else (SPEC V2).
- **New sphere in an existing system** → add the content files; it appears site-wide automatically. The only code touch allowed is one `<symbol id="si-{name}">` in `SVGSprite.astro` for its icon (SPEC C6, V3, V19).
- **New game system** → genuinely cross-cutting; touch `site.ts`, CSS, nav, pages (SPEC C7).

## Key files

| File | Responsibility |
|------|----------------|
| `src/content.config.ts` | `entrySchema` (Zod) + auto-discovery of book collections |
| `src/lib/inferFromPath.ts` | derives `type`/`sphere`/`system` from a content file's path |
| `src/lib/resolveEntries.ts` | builds `ResolvedMaps`, applies errata patches, links entries |
| `src/lib/categorize.ts` | groups a sphere's talents/feats into display sections (+ "Other") |
| `src/lib/url.ts` | base-path-aware link helper — **use `url()` for every internal link** (SPEC C2) |
| `src/lib/remarkEntryLinks.ts` | remark plugin turning entry references into links during markdown build |
| `src/lib/types.ts` | entry + `ResolvedMaps` TypeScript types |
| `src/config/site.ts` | `SYSTEMS` registry: label, color, route, subtitle, etc. (single source — SPEC V4/V5) |
| `src/components/SVGSprite.astro` | every sphere icon `<symbol>` (+ `si-fallback`) |

## Conventions & gotchas

- **Internal links** must go through `url()` — hardcoded `/...` paths break under the `/spheres-wiki/` base (SPEC C2). Every nav/sidebar link must resolve to a real route; no dead links (SPEC V1/V9).
- **Interactive JS** (search init, dropdowns, toasts) must (re)bind on the `astro:page-load` event, not `DOMContentLoaded` — View Transitions swap the DOM and otherwise drop listeners (SPEC V25; this was bug B1).
- **System theming** comes from the `--clr-ns` custom property set by a `data-system` attribute — never add per-system accent blocks to `global.css` (SPEC V4/V10).
- **Placeholders**: stub dates must be `1970-01-01` and stub strings conspicuously fake (`"PLACEHOLDER"`/`"TBD"`) — never plausible-but-wrong values (SPEC §P).
- **Privacy**: no external requests, analytics, or tracking; document any `localStorage` key (name, purpose, retention, deletion path) and keep `/privacy/` accurate (SPEC V11–V14).
- **IDs** are lowercase kebab-case and must equal the filename (SPEC C10/V16).

## Scripts & content pipeline

`scripts/` holds the Wikidot import/ETL and validators — not part of the runtime site:
- `validate.mjs` (runs in `npm run build`), plus `validate-tags.mjs`, `validate-v2.mjs`, `check-links.mjs`, `purge-dead-links.mjs`
- parsers/generators: `parse-wiki.mjs`, `class-parser.mjs`, `archetype-parser.mjs`, `generate-tags.mjs`, `generate-bestial-traits.mjs`, `catalog.mjs`, `migrate-to-nested.mjs`, `download_covers.py`
- See `scripts/PARSE-WIKI.md` for the parsing workflow.

## Testing

- **Unit** (`tests/lib/`, Vitest): schema/resolution/categorize/tags/url/search/etc. Run with `npm test`.
- **E2E** (`tests/e2e/`, Playwright): routes, accessibility, search, meta tags, navigation, performance, toast. Run with `npm run test:e2e` (or the Docker variants). `routes.spec.ts` is kept in sync with SPEC §I.pages.

When adding a feature or fixing a bug, prefer adding/extending a test, and run `npm run validate` to catch content-contract violations before building.
