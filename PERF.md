# Build Performance Tracking

## Baseline (2026-06-02)

| Command | real | user | sys |
|---------|------|------|-----|
| `npm run validate` | 1.987s | 2.45s | 0.28s |
| `node scripts/validate-tags.mjs` | 0.911s | 1.14s | 0.14s |
| `node scripts/validate-v2.mjs` | 0.921s | 1.15s | 0.11s |
| `npm run build` | 66.66s | 85.70s | 5.75s |

### Notes
- 5061 `.md` files in `src/content`
- 143 tags defined, 143 unique tags referenced
- `entryDatabase.ts`: 2171 of 5061 files lack `system:` in frontmatter → 2171 redundant `_book.yaml` reads on cold init

---

## Fix 1: Cache `_book.yaml` reads in `entryDatabase.ts`

**Change**: Add module-level `bookYamlCache` Map so each of the 35 books' `_book.yaml` is read once instead of once per entry lacking `system:` frontmatter.

**Expected**: Reduces cold init `_book.yaml` reads from ~2171 → 35. Impact felt during `astro build` (remarkEntryLinks pipeline).

| Command | real | user | sys | delta |
|---------|------|------|-----|-------|
| `npm run build` | 59.39s | 79.36s | 5.28s | **-7.27s (-11%)** |

Tests: 25,436 passed (no regression)

---

## Fix 2: Merge validate scripts (planned)

---

## Fix 3: Parallel `getCollection` in `resolveEntries` (planned)
