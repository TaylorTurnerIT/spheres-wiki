# §G Goal
Fast, searchable static wiki for Spheres tabletop RPG. Replace Wikidot site. High UX, mobile-first, ranked search.

# §C Constraints
- Astro 6.x + TypeScript.
- Pagefind client-side search.
- Node.js ≥ 22.12.0.
- `src/content/{book}/{type}/*.md` structure.
- `_book.yaml` per content folder.
- Lowercase kebab-case IDs.

# §I Interfaces
- `WikiPage.astro` layout: index control + indexing scope.
- `src/content.config.ts`: Zod schema for entries/books.
- `resolveEntries.ts`: content cross-linking.
- `SVGSprite.astro`: icon registry for spheres.
- `src/config/site.ts`: site navigation, featured release, and brand namespace colors.
- `src/lib/categorize.ts`: categorizes sphere talents and feats, and generates sections (including "Other" catch-all).

# §P Placeholder Conventions
- Placeholder dates **must** use `1970-01-01` (Unix epoch / UTC 0) — never a "plausible" date like 2020-01-01. An obviously wrong date is immediately visible as a stub; a plausible one is silently wrong.
- Placeholder strings should be conspicuously fake (e.g. `"PLACEHOLDER"`, `"TBD"`). Do not guess real values.
- `publishedDate` in `_book.yaml` drives errata ordering (V7). A placeholder must never sort before a real date; `1970-01-01` safely predates all real content.

# §V Invariants
- V1: All `.md` must match `entrySchema` in `src/content.config.ts`.
- V2: `id` in frontmatter must match filename (without extension).
- V3: `sourceBook` must match the parent folder slug.
- V4: Search results must prioritize spheres and classes over talents/feats.
- V5: Every sphere icon must exist in `SVGSprite.astro`.
- V6: Duplicate tag IDs are prohibited across all books.
- V7: Errata patches (`modifies` field) applied in chronological order of books' `publishedDate` ascending.
- V8: Errata patches do not change original `sourceBook` attribution.
- V9: Errata patches do not leak `modifies` field onto resolved entry.
- V10: Each entry claimed by first matching category definition. Entries sorted by `id` ascending.
- V11: Interactive component initializations and event listeners must run on `astro:page-load` to support Astro View Transitions.

# §T Tasks
| id | status | task | cites |
|---|---|---|---|
| T1 | x | Audit all `src/content` for V1/V2/V3 compliance | V1,V2,V3 |
| T2 | x | Verify `SVGSprite.astro` has all icons named in `src/content/**/*.md` | V5 |
| T3 | x | Implement ranking weights in Pagefind for V4 | V4,I.pagefind |
| T4 | x | Add validation script for V2 consistency check | V2 |
| T5 | x | Fix mismatch between test expectation ('feats') and implementation ('general-feats') in categorize.test.ts | I.categorize |
| T6 | x | Wrap search bar initialization in SiteHeader.astro in an astro:page-load event listener | V11 |
| T7 |   | Audit entire website for any possible Flash of Unstyled Content (FOUC) and resolve by removing remote scripts/CSS in favor of local bundling | |

# §B Bugs
| id | date | cause | fix |
|---|---|---|---|
| B1 | 2026-05-25 | Search listeners lost on back/forward navigation due to View Transitions swapped DOM | V11 |
| B2 | 2026-05-25 | Archetype selector visuals are unfinished | |
| B3 | 2026-05-25 | Bestial traits dropdown logic completely broken due to CSS grid refactor | |
