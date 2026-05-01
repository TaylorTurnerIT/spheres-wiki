# Spheres Wiki (in development)

Static reference wiki for the Spheres of Power tabletop RPG system by Drop Dead Studios.
Built with Astro 4.x + TypeScript. Replaces the existing Wikidot site.

## Prerequisites

- Node.js ≥ 22.12.0
- npm

## Setup

```bash
npm install
```

## Dev server

```bash
npm run dev
# → http://localhost:4321
```

## Tests

Unit tests cover the content resolution engine (`buildResolvedMaps`).

```bash
npm test
```

## Type check

```bash
npx astro check
```

## Production build

```bash
npm run build
# output in dist/
```

Preview the build locally:

```bash
npm run preview
```

## Adding content

All game content lives in `src/content/books/`. Each file is a source book YAML.

```yaml
# src/content/books/my-book.yaml
title: "My Book"
publisher: "Drop Dead Studios"
slug: my-book
publishedDate: "2024-01-01"
price: "$19.99"
buyUrl: "https://..."
entries:
  - type: sphere
    id: my-sphere
    namespace: power     # power | might | guile | champions | or any custom slug
    name: My Sphere
    icon: my-sphere      # matches SVG symbol id "si-<icon>"
    description: "..."

  - type: talent
    id: my-talent
    sphere: my-sphere
    namespace: power
    tier: basic          # basic | advanced | legendary
    name: My Talent
    description: "..."
```

To publish errata, create a new book file and use `modifies` on any entry:

```yaml
entries:
  - type: talent
    id: corrected-talent      # any id
    modifies: original-talent # id of the entry being patched
    sphere: alteration
    namespace: power
    tier: basic
    name: Original Talent
    description: "Corrected text."
```

The build engine applies patches in `publishedDate` order. Source book attribution always stays with the original book.

## Project structure

```
src/
  config/site.ts          site title, nav links, featured release, namespace color tokens
  content/
    config.ts             Zod schema for book YAML files
    books/                source book YAML files (one per book/errata)
  components/
    SVGSprite.astro        all sphere icon symbols (60+)
  layouts/
    Base.astro             <html> shell with fonts and View Transitions
    WikiPage.astro         header + sidebar + tab nav + content slot
  lib/
    types.ts               TypeScript types for all entry/book shapes
    resolveEntries.ts      buildResolvedMaps() + resolveEntries() Astro wrapper
  pages/
    index.astro            home page
  styles/
    global.css             design tokens, reset, layout shells
tests/
  lib/resolveEntries.test.ts   Vitest unit tests for the resolution engine
```

## Build plans

| Plan | Status | Scope |
|------|--------|-------|
| Plan 1 — Foundation | ✅ Complete | Astro setup, content engine, layouts, design tokens |
| Plan 2 — Home page | Pending | IntroCards, RefCards, FeaturedRelease, full home page |
| Plan 3 — Inner pages | Pending | Sphere/talent/system/champion/store/side pages |
| Plan 4 — Search & polish | Pending | Pagefind, real sidebar/header components, accessibility pass |
