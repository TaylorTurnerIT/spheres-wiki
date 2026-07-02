# Spheres Wiki (BETA)

Static reference wiki for the Spheres tabletop RPG system by Drop Dead Studios.
Built with Astro 6.x + TypeScript. Replaces the existing Wikidot site with a fast, searchable static experience.

## Status: Beta
The website is currently in **Beta**. Some content and functionality may be incomplete.
- **Reporting Issues**: Visit our [GitHub repository](https://github.com/TaylorTurnerIT/spheres-wiki) to report bugs or discuss changes.

## Features
- **Fast Search**: Powered by [Pagefind](https://pagefind.app/), providing instant client-side results across all content and metadata.
- **Hierarchical Indexing**: Primary entries (Spheres, Classes) are prioritized in search results.
- **Mobile First**: Responsive design with a sidebar-driven navigation.
- **View Transitions**: Seamless page navigation using Astro's View Transitions.

## Prerequisites
- Bun ≥ 1.1.0

## Setup
```bash
bun install
```

## Development
```bash
# Start dev server
bun run dev
# → http://localhost:4321

# Run unit tests
bun run test

# Type check
bunx astro check
```

## Production Build
The build process automatically generates a search index using Pagefind.
```bash
bun run build
# output in dist/

# Preview the build locally
bun run preview
```

## Adding Content
All game content lives in `src/content/`. The system uses a dynamic discovery mechanism for books.

### Creating a New Book
1. Create a directory in `src/content/` (e.g., `src/content/my-book/`).
2. Add a `_book.yaml` in that directory (slug is derived from the folder name — do not add it here):
   ```yaml
   title: "My Book"
   publisher: "Drop Dead Studios"
   publishedDate: "2024-01-01"
   price: "$19.99"
   buyUrl: "https://..."
   ```
3. Add entries as Markdown files under `{system}/spheres/`, `{system}/feats/`, etc.

### Frontmatter Example
`type`, `system`, and `sourceBook` are all inferred from the file path — do not add them to frontmatter.
```yaml
---
id: my-talent
name: My Talent
sphere: alteration
tier: basic
tags: ["transformation", "utility"]
---
Talent description goes here...
```

## Project Structure
```
src/
  config/site.ts          SYSTEMS registry — single source of truth for system metadata (label, color, route)
  content.config.ts       Zod entry schema + auto-discovery of book collections
  content/
    */_book.yaml          book-level metadata (title, publisher, publishedDate, price?, buyUrl?)
    */{system}/{type}/*.md  individual content entries (type/system inferred from path)
  components/
    SVGSprite.astro        all sphere icon symbols
    BetaToast.astro        dismissible beta notification
  layouts/
    WikiPage.astro         header + sidebar + tab nav + content slot (marks Pagefind indexing scope)
  lib/
    resolveEntries.ts      content resolution, errata patching, build-time cache (resolveEntries, getCollEntriesMap)
    inferFromPath.ts       derives type/sphere/system from a content file's path
    categorize.ts          groups sphere talents/feats into display sections
    tags.ts                buildOrderedTagIds — auto-injects system/tier tags, sorts by priority
    url.ts                 base-path-aware link helper (use for every internal link)
  styles/
    global.css             design tokens, layout, per-system theming via --clr-ns
```

## Progress
| Phase | Status | Scope |
|------|--------|-------|
| 1 — Foundation | ✅ Complete | Astro setup, content engine, layouts, design tokens |
| 2 — Home page | ✅ Complete | IntroCards, RefCards, full home page |
| 3 — Inner pages | ✅ Complete | Namespace index, entry detail, store, side pages |
| 4 — Search & Beta | ✅ Complete | Pagefind integration, beta toast, ranking optimization |
