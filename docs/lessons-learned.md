# Lessons Learned

Operational notes from recent fixes. Keep this focused on repeatable engineering lessons, not a changelog.

## Entry Lookup Performance

- `src/lib/entryDatabase.ts` is on the hot path for prerequisite auto-linking tests and markdown rendering. Avoid full-content markdown reads when all a lookup needs is `id`, `name`, `type`, `system`, and `sphere`.
- Prefer path-derived metadata from `inferFromPath()` before legacy book-level fallbacks. `system` is path-encoded by project contract; `_book.yaml` system fields are legacy compatibility only.
- For real-content lookup changes, compare results against a full-YAML baseline across all URL-capable entries. Flat feat entries need `sphere` from frontmatter, so a path-only or too-narrow scalar extractor can silently break feat URLs.
- Do not fix slow real-content tests by raising timeouts first. Confirm whether production code is doing unnecessary synchronous I/O and make the cold path cheaper.

## Biome And Fallow Cleanup

- Run `bun run lint` after formatting. `biome format` can fix formatting while `biome check` still reports organize-imports or lint findings.
- If `fallow` is not on PATH, use `bunx fallow ...`. Before commits, the required local gate is `bunx fallow audit --format json --quiet --explain --gate-marker agent`.
- For `noNonNullAssertion`, prefer explicit guards in production code. In tests, assert the value exists with `expect(value).toBeDefined()` before checking specific fields.
- CSS selector ordering matters for Biome's `noDescendingSpecificity`: put base selectors before more-specific contextual selectors such as `.home-store .store-card`, and remove empty media blocks rather than leaving placeholders.

## Astro Component Scripts In Templates

- Astro component `<script>` blocks only execute when the component renders **directly into the DOM**. If the component is rendered inside a `<template>` tag (e.g. for later cloning via `template.content.cloneNode()`), the script is inert — it never runs.
- For components used both directly AND inside templates (like `ArticleTOC`), move client-side logic to an external `.ts` module and import it via a `<script>` block in the common ancestor layout (not a frontmatter `import`, which would SSR-evaluate and crash on `window`/`document`).
- Register globals (`window.reinitX`) and event listeners (`document.addEventListener`) at module scope so they're available before any downstream `astro:page-load` handler tries to call them.
- Use `requestAnimationFrame` (not `setTimeout(0)`) in init code that depends on sibling components' module-level registrations — it fires after all synchronous scripts in the same bundle have executed.
