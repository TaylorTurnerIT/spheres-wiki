# Spheres Wiki (BETA)

Static reference wiki for the Spheres tabletop RPG system by Drop Dead Studios.
Built with Astro 4.x + TypeScript. Replaces the existing Wikidot site with a fast, searchable static experience.

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
2. Add a `_book.yaml` in that directory:
   ```yaml
   title: "My Book"
   publisher: "Drop Dead Studios"
   slug: my-book
   publishedDate: "2024-01-01"
   price: "$19.99"
   buyUrl: "https://..."
   ```
3. Add entries as Markdown files with frontmatter in subdirectories (spheres, talents, feats, classes).

### Frontmatter Example
```yaml
---
id: my-talent
name: My Talent
system: power
sourceBook: my-book
type: talent
sphere: alteration
tier: basic
tags: ["transformation", "utility"]
---
Talent description goes here...
```

## Project Structure
```
src/
  config/site.ts          site title, nav links, featured release, namespace color tokens
  content/
    config.ts             Zod schema and collection discovery
    */_book.yaml          book-level metadata
    */{type}/*.md         individual content entries
  components/
    SVGSprite.astro        all sphere icon symbols (60+)
    BetaToast.astro        dismissible beta notification
  layouts/
    WikiPage.astro         header + sidebar + tab nav + content slot (marks indexing scope)
  lib/
    resolveEntries.ts      content resolution and linking logic
    url.ts                 base path aware link helper
  styles/
    global.css             design tokens, search results, and layout styles
```

## Progress
| Phase | Status | Scope |
|------|--------|-------|
| 1 — Foundation | ✅ Complete | Astro setup, content engine, layouts, design tokens |
| 2 — Home page | ✅ Complete | IntroCards, RefCards, FeaturedRelease, full home page |
| 3 — Inner pages | ✅ Complete | Namespace index, entry detail, store, side pages |
| 4 — Search & Beta | ✅ Complete | Pagefind integration, beta toast, ranking optimization |
