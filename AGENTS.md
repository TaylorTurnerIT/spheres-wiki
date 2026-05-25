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

# §T Tasks
| id | status | task | cites |
|---|---|---|---|
| T1 | x | Audit all `src/content` for V1/V2/V3 compliance | V1,V2,V3 |
| T2 | x | Verify `SVGSprite.astro` has all icons named in `src/content/**/*.md` | V5 |
| T3 | . | Implement ranking weights in Pagefind for V4 | V4,I.pagefind |
| T4 | . | Add validation script for V2 consistency check | V2 |
| T5 | x | Fix mismatch between test expectation ('feats') and implementation ('general-feats') in categorize.test.ts | I.categorize |

# §B Bugs
| id | date | cause | fix |
|---|---|---|---|
