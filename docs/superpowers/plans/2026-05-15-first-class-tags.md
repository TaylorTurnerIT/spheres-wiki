# First-Class Tag System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate tags from bare strings with hardcoded CSS to first-class entities with definition files, colors, priorities, hover tooltips, and dedicated index/listing pages.

**Architecture:** Tag definitions live in `src/content/{book}/tags/{slug}.md` and are parsed by a new `buildTagMap()` function in `resolveEntries.ts` (separate from `buildResolvedMaps`, fully unit-testable). A new `TagBadge.astro` component replaces all inline `<span class="talent-tag">` sites, adding tooltip markup and CSS-variable-driven colors. Two new pages (`/tags/` and `/tags/[tag]/`) are generated at build time.

**Tech Stack:** Astro 4.x, Zod discriminated union schema, Vitest, plain CSS (no JS for tooltips)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/types.ts` | Modify | Add `TagEntry` type; add `tagMap` to `ResolvedMaps` |
| `src/content/config.ts` | Modify | Add `type: "tag"` schema to discriminated union |
| `src/lib/resolveEntries.ts` | Modify | Add `buildTagMap()` export; call it in `resolveEntries()` |
| `tests/lib/resolveEntries.test.ts` | Modify | Add `buildTagMap` unit tests |
| `src/content/spheres-of-power-core/tags/*.md` | Create ×10 | Tag definition files |
| `src/components/TagBadge.astro` | Create | Replaces inline tag spans everywhere |
| `src/styles/global.css` | Modify | CSS-variable-driven `.talent-tag`, tooltip rules, remove old data-tag overrides |
| `src/pages/tags/index.astro` | Create | Lists all tags sorted by priority |
| `src/pages/tags/[tag].astro` | Create | Per-tag page grouped by system |
| `src/pages/power/[sphere]/index.astro` | Modify | Import `tagMap`, sort tags, use `TagBadge` |
| `src/pages/power/[sphere]/[talent].astro` | Modify | Same |
| `src/pages/power/[sphere]/feats/[feat].astro` | Modify | Same |
| `src/pages/might/[sphere]/index.astro` | Modify | Same |
| `src/pages/might/[sphere]/[talent].astro` | Modify | Same |
| `src/pages/might/[sphere]/feats/[feat].astro` | Modify | Same |
| `src/pages/guile/[sphere]/index.astro` | Modify | Same |
| `src/pages/guile/[sphere]/[talent].astro` | Modify | Same |
| `src/pages/guile/[sphere]/feats/[feat].astro` | Modify | Same |

---

## Task 1: Add `TagEntry` type and extend `ResolvedMaps`

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `TagEntry` and update `ResolvedMaps` in `src/lib/types.ts`**

  After `ArticleEntry`, add:

  ```ts
  export type TagEntry = {
    type: "tag";
    id: string;
    label: string;
    color?: string;
    priority: number;
    description: string;
    sourceBook: string; // injected by resolveEntries — not in frontmatter
  };
  ```

  `AnyEntry` stays **unchanged** — `TagEntry` is NOT added to it (tags are processed separately from content entries to avoid union-narrowing conflicts).

  In `ResolvedMaps`, add one field:

  ```ts
  export type ResolvedMaps = {
    sphereMap: Map<EntryKey, SphereEntry>;
    talentMap: Map<EntryKey, TalentEntry>;
    featMap: Map<EntryKey, FeatEntry>;
    classMap: Map<EntryKey, ClassEntry>;
    articleMap: Map<EntryKey, ArticleEntry>;
    entrySourceBook: Map<EntryKey, string>;
    bookMetaMap: Map<string, BookMeta>;
    tagMap: Map<string, TagEntry>;    // ← new
  };
  ```

- [ ] **Step 2: Verify TypeScript sees no errors**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: only errors about `tagMap` not yet returned by `buildResolvedMaps` (we'll fix in Task 3). If you see other errors, investigate before continuing.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/types.ts
  git commit -m "feat: add TagEntry type and tagMap to ResolvedMaps"
  ```

---

## Task 2: Add tag schema to `config.ts`

**Files:**
- Modify: `src/content/config.ts`

- [ ] **Step 1: Add tag schema to the discriminated union**

  In `src/content/config.ts`, the `entrySchema` uses `z.discriminatedUnion("type", [...])`. Add a tag object at the **end** of the array (after the `article` object):

  ```ts
  z.object({
    type: z.literal("tag"),
    id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
    label: z.string(),
    color: z.string().optional(),
    priority: z.number().int().min(1),
    description: z.string(),
  }),
  ```

  Note: No `baseFields` spread — tags intentionally lack `name`, `system`, `tags`, `modifies`, `sourceBook` fields.

- [ ] **Step 2: Verify build doesn't break**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx astro check 2>&1 | tail -20
  ```

  Expected: 0 errors (or same errors as before this task — we haven't created tag files yet so no new content to validate).

- [ ] **Step 3: Commit**

  ```bash
  git add src/content/config.ts
  git commit -m "feat: add tag schema to content collection discriminated union"
  ```

---

## Task 3: Write failing tests for `buildTagMap`

**Files:**
- Modify: `tests/lib/resolveEntries.test.ts`

- [ ] **Step 1: Add `buildTagMap` import and tag test suite to the existing test file**

  In `tests/lib/resolveEntries.test.ts`, update the import line and append a new `describe` block at the bottom:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { buildResolvedMaps, buildTagMap } from '../../src/lib/resolveEntries';
  import type { AnyEntry } from '../../src/lib/types';
  ```

  Append after the existing `describe('buildResolvedMaps', ...)` block:

  ```ts
  describe('buildTagMap', () => {
    it('stores a tag by its id', () => {
      const result = buildTagMap([
        {
          slug: 'spheres-of-power-core',
          rawTagEntries: [
            { id: 'combat', label: 'Combat', color: '#8f2d00', priority: 1, description: 'Combat stuff.' },
          ],
        },
      ]);
      expect(result.has('combat')).toBe(true);
      expect(result.get('combat')!.label).toBe('Combat');
      expect(result.get('combat')!.priority).toBe(1);
    });

    it('injects sourceBook from book slug, overriding any value in the raw entry', () => {
      const result = buildTagMap([
        {
          slug: 'spheres-of-power-core',
          rawTagEntries: [
            { id: 'combat', label: 'Combat', priority: 1, description: 'Combat.' },
          ],
        },
      ]);
      expect(result.get('combat')!.sourceBook).toBe('spheres-of-power-core');
    });

    it('sets type to "tag" on the stored entry', () => {
      const result = buildTagMap([
        {
          slug: 'book-a',
          rawTagEntries: [{ id: 'utility', label: 'Utility', priority: 5, description: 'Utility.' }],
        },
      ]);
      expect(result.get('utility')!.type).toBe('tag');
    });

    it('throws on duplicate tag id across books', () => {
      expect(() =>
        buildTagMap([
          {
            slug: 'book-a',
            rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'A.' }],
          },
          {
            slug: 'book-b',
            rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'B.' }],
          },
        ])
      ).toThrow('Duplicate tag "combat"');
    });

    it('error message names both books', () => {
      expect(() =>
        buildTagMap([
          { slug: 'book-a', rawTagEntries: [{ id: 'x', label: 'X', priority: 1, description: 'X.' }] },
          { slug: 'book-b', rawTagEntries: [{ id: 'x', label: 'X', priority: 1, description: 'X.' }] },
        ])
      ).toThrow(/book-a.*book-b|book-b.*book-a/);
    });

    it('returns empty map when no tag entries', () => {
      const result = buildTagMap([{ slug: 'book-a', rawTagEntries: [] }]);
      expect(result.size).toBe(0);
    });

    it('collects tags from multiple books without conflict', () => {
      const result = buildTagMap([
        { slug: 'book-a', rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'A.' }] },
        { slug: 'book-b', rawTagEntries: [{ id: 'utility', label: 'Utility', priority: 5, description: 'B.' }] },
      ]);
      expect(result.size).toBe(2);
      expect(result.get('utility')!.sourceBook).toBe('book-b');
    });
  });
  ```

- [ ] **Step 2: Run tests — confirm they fail with "not exported"**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx vitest run 2>&1 | tail -20
  ```

  Expected: tests fail because `buildTagMap` is not yet exported from `resolveEntries.ts`.

- [ ] **Step 3: Commit failing tests**

  ```bash
  git add tests/lib/resolveEntries.test.ts
  git commit -m "test: add failing buildTagMap tests"
  ```

---

## Task 4: Implement `buildTagMap` in `resolveEntries.ts`

**Files:**
- Modify: `src/lib/resolveEntries.ts`

- [ ] **Step 1: Add `TagEntry` import and define `RawTagEntry` + `buildTagMap`**

  Update the import at the top of `src/lib/resolveEntries.ts`:

  ```ts
  import type {
    AnyEntry,
    SphereEntry,
    TalentEntry,
    FeatEntry,
    ClassEntry,
    ArticleEntry,
    TagEntry,
    EntryKey,
    ResolvedMaps,
    BookMeta,
  } from "./types";
  ```

  After the `entryKey` helper (line 16), add:

  ```ts
  type RawTagEntry = {
    id: string;
    label: string;
    color?: string;
    priority: number;
    description: string;
  };

  export function buildTagMap(
    books: Array<{ slug: string; rawTagEntries: RawTagEntry[] }>,
  ): Map<string, TagEntry> {
    const tagMap = new Map<string, TagEntry>();
    for (const book of books) {
      for (const raw of book.rawTagEntries) {
        if (tagMap.has(raw.id)) {
          throw new Error(
            `Duplicate tag "${raw.id}" defined in both "${tagMap.get(raw.id)!.sourceBook}" and "${book.slug}"`,
          );
        }
        tagMap.set(raw.id, {
          type: "tag",
          ...raw,
          sourceBook: book.slug,
        });
      }
    }
    return tagMap;
  }
  ```

- [ ] **Step 2: Update `buildResolvedMaps` to return `tagMap` (always empty — tags handled in `resolveEntries`)**

  In `buildResolvedMaps`, initialize and return an empty tagMap:

  ```ts
  export function buildResolvedMaps(
    books: Array<{ slug: string; publishedDate: string; entries: AnyEntry[] }>,
  ): ResolvedMaps {
    // ... existing code ...
    const tagMap = new Map<string, TagEntry>();  // ← add this line

    // ... existing sort/loop code unchanged ...

    return {
      sphereMap,
      talentMap,
      featMap,
      classMap,
      articleMap,
      entrySourceBook,
      bookMetaMap,
      tagMap,          // ← add to return
    };
  }
  ```

- [ ] **Step 3: Update `resolveEntries()` to build and return the real `tagMap`**

  In `resolveEntries()`, split raw entries into tag entries and content entries, then call `buildTagMap`. Replace the existing `allBooks` construction loop with:

  ```ts
  const allBooks: Array<{
    slug: string;
    publishedDate: string;
    entries: AnyEntry[];
  }> = [];
  const tagEntriesByBook: Array<{ slug: string; rawTagEntries: RawTagEntry[] }> = [];

  for (const collectionSlug of bookMetaMap.keys()) {
    const meta = bookMetaMap.get(collectionSlug);
    const publishedDate = meta?.publishedDate ?? "1970-01-01";

    let rawEntries: Awaited<ReturnType<typeof getCollection>>;
    try {
      rawEntries = await getCollection(collectionSlug as any);
    } catch {
      rawEntries = [];
    }

    const tagEntries: RawTagEntry[] = rawEntries
      .filter((e) => (e.data as any).type === "tag")
      .map((e) => e.data as unknown as RawTagEntry);

    const contentEntries: AnyEntry[] = rawEntries
      .filter((e) => (e.data as any).type !== "tag")
      .map((e) => {
        const entry = e.data as AnyEntry;
        entry.sourceBook = collectionSlug;
        return entry;
      });

    tagEntriesByBook.push({ slug: collectionSlug, rawTagEntries: tagEntries });
    allBooks.push({ slug: collectionSlug, publishedDate, entries: contentEntries });
  }

  const tagMap = buildTagMap(tagEntriesByBook);
  const maps = buildResolvedMaps(allBooks);
  return { ...maps, bookMetaMap, tagMap };
  ```

- [ ] **Step 4: Run tests — all should pass**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx vitest run 2>&1 | tail -20
  ```

  Expected: all tests pass (19 existing + 7 new = 26 total).

- [ ] **Step 5: TypeScript check**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/resolveEntries.ts
  git commit -m "feat: implement buildTagMap with duplicate detection"
  ```

---

## Task 5: Create tag content files

**Files:**
- Create: `src/content/spheres-of-power-core/tags/combat.md`
- Create: `src/content/spheres-of-power-core/tags/dual-sphere.md`
- Create: `src/content/spheres-of-power-core/tags/body.md`
- Create: `src/content/spheres-of-power-core/tags/transformation.md`
- Create: `src/content/spheres-of-power-core/tags/utility.md`
- Create: `src/content/spheres-of-power-core/tags/instill.md`
- Create: `src/content/spheres-of-power-core/tags/mass.md`
- Create: `src/content/spheres-of-power-core/tags/range.md`
- Create: `src/content/spheres-of-power-core/tags/strike.md`
- Create: `src/content/spheres-of-power-core/tags/3pp.md`

- [ ] **Step 1: Create `src/content/spheres-of-power-core/tags/combat.md`**

  ```markdown
  ---
  type: tag
  id: combat
  label: "Combat"
  color: "#8f2d00"
  priority: 1
  description: "Modifies or interacts with the combat rules."
  ---
  ```

- [ ] **Step 2: Create `src/content/spheres-of-power-core/tags/dual-sphere.md`**

  ```markdown
  ---
  type: tag
  id: dual-sphere
  label: "Dual-Sphere"
  color: "#3c0078"
  priority: 2
  description: "Requires or references talents from another sphere."
  ---
  ```

- [ ] **Step 3: Create `src/content/spheres-of-power-core/tags/body.md`**

  ```markdown
  ---
  type: tag
  id: body
  label: "Body"
  color: "#1a6622"
  priority: 3
  description: "Grants traits that mimic a specific creature type, such as limbs, natural attacks, or special senses."
  ---
  ```

- [ ] **Step 4: Create `src/content/spheres-of-power-core/tags/transformation.md`**

  ```markdown
  ---
  type: tag
  id: transformation
  label: "Transformation"
  color: "#174b93"
  priority: 4
  description: "Grants additional transformation forms or modes."
  ---
  ```

- [ ] **Step 5: Create `src/content/spheres-of-power-core/tags/utility.md`**

  ```markdown
  ---
  type: tag
  id: utility
  label: "Utility"
  color: "#5a2d96"
  priority: 5
  description: "General-purpose ability with broad non-combat applications."
  ---
  ```

- [ ] **Step 6: Create `src/content/spheres-of-power-core/tags/instill.md`**

  ```markdown
  ---
  type: tag
  id: instill
  label: "Instill"
  color: "#8a5500"
  priority: 6
  description: "Applied as an effect instilled into a target or object."
  ---
  ```

- [ ] **Step 7: Create `src/content/spheres-of-power-core/tags/mass.md`**

  ```markdown
  ---
  type: tag
  id: mass
  label: "Mass"
  color: "#006478"
  priority: 7
  description: "Affects multiple targets simultaneously."
  ---
  ```

- [ ] **Step 8: Create `src/content/spheres-of-power-core/tags/range.md`**

  ```markdown
  ---
  type: tag
  id: range
  label: "Range"
  color: "#8f2d00"
  priority: 8
  description: "Modifies the range of an ability."
  ---
  ```

- [ ] **Step 9: Create `src/content/spheres-of-power-core/tags/strike.md`**

  ```markdown
  ---
  type: tag
  id: strike
  label: "Strike"
  color: "#990000"
  priority: 9
  description: "Delivered as or combined with a weapon strike."
  ---
  ```

- [ ] **Step 10: Create `src/content/spheres-of-power-core/tags/3pp.md`**

  ```markdown
  ---
  type: tag
  id: 3pp
  label: "3PP"
  color: "#7a4200"
  priority: 10
  description: "Content from a third-party publisher."
  ---
  ```

- [ ] **Step 11: Verify Astro accepts the new files**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx astro check 2>&1 | tail -20
  ```

  Expected: 0 errors.

- [ ] **Step 12: Commit**

  ```bash
  git add src/content/spheres-of-power-core/tags/
  git commit -m "feat: add tag definition files for spheres-of-power-core"
  ```

---

## Task 6: Create `TagBadge.astro` component

**Files:**
- Create: `src/components/TagBadge.astro`

- [ ] **Step 1: Create `src/components/TagBadge.astro`**

  ```astro
  ---
  import type { TagEntry, BookMeta } from '@/lib/types';

  interface Props {
    tagId: string;
    tagMap: Map<string, TagEntry>;
    bookMetaMap: Map<string, BookMeta>;
  }

  const { tagId, tagMap, bookMetaMap } = Astro.props;
  const tag = tagMap.get(tagId);
  const color = tag?.color ?? 'var(--clr-brand)';
  const bookTitle = tag
    ? (bookMetaMap.get(tag.sourceBook)?.title ?? tag.sourceBook)
    : undefined;
  ---
  <span class="tag-wrapper">
    <span
      class="talent-tag"
      data-tag={tagId}
      style={tag ? `--tag-clr: ${color}` : undefined}
    >
      {tag?.label ?? tagId}
    </span>
    {tag && (
      <div class="tag-tooltip" role="tooltip">
        <p class="tag-tooltip-name">{tag.label}</p>
        <p class="tag-tooltip-desc">{tag.description}</p>
        {bookTitle && <p class="tag-tooltip-source">{bookTitle}</p>}
      </div>
    )}
  </span>
  ```

  Notes:
  - When `tag` is not found (undefined tag): renders with no `style` attribute, so `.talent-tag` falls back to `--clr-brand` via CSS. No tooltip.
  - When `tag` is found: injects `--tag-clr` CSS variable with the tag's color. Tooltip shows label, description, source book title.

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/TagBadge.astro
  git commit -m "feat: add TagBadge component with CSS tooltip"
  ```

---

## Task 7: Update CSS in `global.css`

**Files:**
- Modify: `src/styles/global.css`

The current file has:
- Lines 1423–1435: base `.talent-tag` rule (keep, but rewrite colors to use `--tag-clr` variable)
- Lines 1436–1487: per-tag `[data-tag="*"]` color overrides (remove all)
- Lines 1471–1477: `.talent-tag[data-tag="3pp"]` includes color AND `text-transform`/`letter-spacing` (keep only the display properties, not color)

- [ ] **Step 1: Replace the `.talent-tag` base rule (lines 1423–1435)**

  Find this block:

  ```css
  .talent-tag {
    font-family: var(--font-display);
    font-size: var(--fs-3xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(100, 80, 40, 0.12);
    color: #5a4a38;
    border: 1px solid rgba(100, 80, 40, 0.35);
    white-space: nowrap;
  }
  ```

  Replace with:

  ```css
  .talent-tag {
    font-family: var(--font-display);
    font-size: var(--fs-3xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    padding: 1px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--tag-clr, var(--clr-brand)) 12%, transparent);
    color: var(--tag-clr, var(--clr-brand));
    border: 1px solid color-mix(in srgb, var(--tag-clr, var(--clr-brand)) 40%, transparent);
    white-space: nowrap;
  }
  ```

- [ ] **Step 2: Remove all `[data-tag="*"]` color overrides (lines 1436–1487) and replace with just the 3pp display rule**

  Delete this entire block:

  ```css
  .talent-tag[data-tag="transformation"] {
    background: rgba(23, 75, 147, 0.12);
    color: #174b93;
    border-color: rgba(23, 75, 147, 0.4);
  }
  .talent-tag[data-tag="body"] {
    background: rgba(22, 90, 28, 0.12);
    color: #1a6622;
    border-color: rgba(22, 90, 28, 0.4);
  }
  .talent-tag[data-tag="utility"] {
    background: rgba(90, 45, 150, 0.12);
    color: #5a2d96;
    border-color: rgba(90, 45, 150, 0.4);
  }
  .talent-tag[data-tag="instill"] {
    background: rgba(160, 100, 0, 0.12);
    color: #8a5500;
    border-color: rgba(160, 100, 0, 0.4);
  }
  .talent-tag[data-tag="mass"] {
    background: rgba(0, 100, 120, 0.12);
    color: #006478;
    border-color: rgba(0, 100, 120, 0.4);
  }
  .talent-tag[data-tag="range"] {
    background: rgba(143, 45, 0, 0.12);
    color: #8f2d00;
    border-color: rgba(143, 45, 0, 0.4);
  }
  .talent-tag[data-tag="strike"] {
    background: rgba(153, 0, 0, 0.12);
    color: #990000;
    border-color: rgba(153, 0, 0, 0.4);
  }
  .talent-tag[data-tag="3pp"] {
    background: rgba(130, 70, 0, 0.15);
    color: #7a4200;
    border-color: rgba(130, 70, 0, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .talent-tag[data-tag="combat"] {
    background: rgba(143, 45, 0, 0.12);
    color: #8f2d00;
    border-color: rgba(143, 45, 0, 0.4);
  }
  .talent-tag[data-tag="dual-sphere"] {
    background: rgba(60, 0, 120, 0.1);
    color: #3c0078;
    border-color: rgba(60, 0, 120, 0.35);
  }
  ```

  And replace with just:

  ```css
  .talent-tag[data-tag="3pp"] {
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  ```

- [ ] **Step 3: Add tooltip and wrapper CSS — insert after the `.talent-tag[data-tag="3pp"]` rule**

  ```css
  .tag-wrapper {
    position: relative;
    display: inline-block;
  }
  .tag-tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    background: var(--clr-surface);
    border: 0.5px solid var(--clr-border);
    border-radius: var(--radius);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
    z-index: 100;
  }
  .tag-wrapper:hover .tag-tooltip {
    opacity: 1;
    pointer-events: auto;
  }
  .tag-tooltip-name {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--clr-text);
    margin: 0;
  }
  .tag-tooltip-desc {
    font-size: var(--fs-2xs);
    color: var(--clr-text);
    line-height: 1.4;
    margin: 0;
  }
  .tag-tooltip-source {
    font-size: var(--fs-3xs);
    color: var(--clr-muted);
    font-style: italic;
    margin: 0;
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/styles/global.css
  git commit -m "feat: update talent-tag CSS to use --tag-clr variable, add tooltip styles"
  ```

---

## Task 8: Create `/tags/index.astro` and `/tags/[tag].astro`

**Files:**
- Create: `src/pages/tags/index.astro`
- Create: `src/pages/tags/[tag].astro`

- [ ] **Step 1: Create `src/pages/tags/index.astro`**

  ```astro
  ---
  import { url } from '@/lib/url';
  import WikiPage from '@/layouts/WikiPage.astro';
  import TagBadge from '@/components/TagBadge.astro';
  import { resolveEntries } from '@/lib/resolveEntries';

  const { tagMap, bookMetaMap } = await resolveEntries();

  const sortedTags = [...tagMap.values()].sort(
    (a, b) => a.priority - b.priority || a.label.localeCompare(b.label),
  );
  ---
  <WikiPage title="All Tags — Spheres Wiki">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={url('/')} data-astro-prefetch="hover">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span>Tags</span>
    </nav>

    <div class="content-main" style="max-width: 640px;">
      <div class="page-title" id="overview">Tags</div>
      <hr class="page-title-rule" />

      <div class="tag-index-list">
        {sortedTags.map(tag => (
          <div class="tag-index-row">
            <a href={url(`/tags/${tag.id}/`)} class="tag-index-badge" data-astro-prefetch="hover">
              <TagBadge tagId={tag.id} tagMap={tagMap} bookMetaMap={bookMetaMap} />
            </a>
            <span class="tag-index-desc">{tag.description}</span>
          </div>
        ))}
        {sortedTags.length === 0 && <p>No tags defined yet.</p>}
      </div>
    </div>
  </WikiPage>

  <style>
    .tag-index-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }
    .tag-index-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .tag-index-badge {
      text-decoration: none;
      flex-shrink: 0;
    }
    .tag-index-badge:hover {
      opacity: 0.85;
    }
    .tag-index-desc {
      font-size: var(--fs-sm);
      color: var(--clr-muted);
    }
  </style>
  ```

- [ ] **Step 2: Create `src/pages/tags/[tag].astro`**

  ```astro
  ---
  import { url } from '@/lib/url';
  import WikiPage from '@/layouts/WikiPage.astro';
  import TagBadge from '@/components/TagBadge.astro';
  import { resolveEntries } from '@/lib/resolveEntries';
  import { BOOK_COLLECTIONS } from '@/content/config';
  import type { TagEntry, TalentEntry, FeatEntry, SphereEntry, BookMeta } from '@/lib/types';

  type EntryRow = {
    id: string;
    name: string;
    system: string;
    sphereId: string;
    entryType: 'talent' | 'feat' | 'sphere';
    sphereName: string;
    tier?: string;
  };

  type SystemGroup = {
    systemLabel: string;
    entries: EntryRow[];
  };

  interface Props {
    tag: TagEntry;
    groups: SystemGroup[];
    collEntry: any;
    bookTitle: string;
    tagMap: Map<string, TagEntry>;
    bookMetaMap: Map<string, BookMeta>;
  }

  export async function getStaticPaths() {
    const { getCollection } = await import('astro:content');
    const { tagMap, talentMap, featMap, sphereMap, bookMetaMap } = await resolveEntries();

    // Collect tag collection entries for body rendering
    const tagCollEntries = new Map<string, any>();
    for (const slug of BOOK_COLLECTIONS) {
      try {
        const entries = await getCollection(slug as any);
        for (const e of entries) {
          if ((e.data as any).type === 'tag') {
            tagCollEntries.set((e.data as any).id, e);
          }
        }
      } catch {}
    }

    const SYSTEM_LABELS: Record<string, string> = {
      power: 'Spheres of Power',
      might: 'Spheres of Might',
      guile: 'Spheres of Guile',
    };

    const paths = [];

    for (const [, tag] of tagMap) {
      const groups: SystemGroup[] = [];

      for (const system of ['power', 'might', 'guile'] as const) {
        const rows: EntryRow[] = [];

        for (const [, talent] of talentMap) {
          if (talent.system !== system || !talent.tags.includes(tag.id)) continue;
          const sphere = [...sphereMap.values()].find(
            s => s.id === talent.sphere && s.system === system,
          );
          rows.push({
            id: talent.id,
            name: talent.name,
            system,
            sphereId: talent.sphere,
            entryType: 'talent',
            sphereName: sphere?.name ?? talent.sphere,
            tier: talent.tier,
          });
        }

        for (const [, feat] of featMap) {
          if (feat.system !== system || !feat.tags.includes(tag.id)) continue;
          const sphere = [...sphereMap.values()].find(
            s => s.id === feat.sphere && s.system === system,
          );
          rows.push({
            id: feat.id,
            name: feat.name,
            system,
            sphereId: feat.sphere,
            entryType: 'feat',
            sphereName: sphere?.name ?? feat.sphere,
          });
        }

        for (const [, sphere] of sphereMap) {
          if (sphere.system !== system || !sphere.tags.includes(tag.id)) continue;
          rows.push({
            id: sphere.id,
            name: sphere.name,
            system,
            sphereId: sphere.id,
            entryType: 'sphere',
            sphereName: sphere.name,
          });
        }

        rows.sort((a, b) => a.name.localeCompare(b.name));

        if (rows.length > 0) {
          groups.push({ systemLabel: SYSTEM_LABELS[system], entries: rows });
        }
      }

      paths.push({
        params: { tag: tag.id },
        props: {
          tag,
          groups,
          collEntry: tagCollEntries.get(tag.id),
          bookTitle: bookMetaMap.get(tag.sourceBook)?.title ?? tag.sourceBook,
          tagMap,
          bookMetaMap,
        },
      });
    }

    return paths;
  }

  const { tag, groups, collEntry, bookTitle, tagMap, bookMetaMap } = Astro.props;
  const TagBody = collEntry?.body ? (await collEntry.render()).Content : null;
  ---
  <WikiPage title={`${tag.label} — Tags — Spheres Wiki`}>
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={url('/')} data-astro-prefetch="hover">Home</a>
      <span class="breadcrumb-sep">›</span>
      <a href={url('/tags/')} data-astro-prefetch="hover">Tags</a>
      <span class="breadcrumb-sep">›</span>
      <span>{tag.label}</span>
    </nav>

    <div class="content-main" style="max-width: 720px;">
      <div class="page-title" id="overview">
        <TagBadge tagId={tag.id} tagMap={tagMap} bookMetaMap={bookMetaMap} />
        {tag.label}
      </div>
      <hr class="page-title-rule" />

      <p class="entry-description">{tag.description}</p>

      {TagBody && (
        <div class="entry-description">
          <TagBody />
        </div>
      )}

      <p class="talent-source">{bookTitle}</p>

      {groups.length === 0 && (
        <p class="section-empty">No content with this tag yet.</p>
      )}

      {groups.map(group => (
        <div class="section-group">
          <div class="section-group-header">
            <span class="section-group-label">{group.systemLabel}</span>
            <div class="section-group-rule"></div>
          </div>
          <div class="tag-entry-list">
            {group.entries.map(row => (
              <div class="tag-entry-row">
                {row.entryType === 'talent' && (
                  <a href={url(`/${row.system}/${row.sphereId}/${row.id}/`)} class="tag-entry-name" data-astro-prefetch="hover">
                    {row.name}
                  </a>
                )}
                {row.entryType === 'feat' && (
                  <a href={url(`/${row.system}/${row.sphereId}/feats/${row.id}/`)} class="tag-entry-name" data-astro-prefetch="hover">
                    {row.name}
                  </a>
                )}
                {row.entryType === 'sphere' && (
                  <a href={url(`/${row.system}/${row.id}/`)} class="tag-entry-name" data-astro-prefetch="hover">
                    {row.name}
                  </a>
                )}
                <span class={`talent-tier ${row.entryType}`}>
                  {row.entryType === 'talent'
                    ? (row.tier === 'base' ? 'Base Ability' : row.tier)
                    : row.entryType === 'feat'
                    ? 'Feat'
                    : 'Sphere'}
                </span>
                <span class="tag-entry-sphere">{row.sphereName}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </WikiPage>

  <style>
    .tag-entry-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 24px;
    }
    .tag-entry-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tag-entry-name {
      font-size: var(--fs-sm);
      color: var(--clr-link);
      text-decoration: none;
      font-weight: 500;
    }
    .tag-entry-name:hover {
      text-decoration: underline;
    }
    .tag-entry-sphere {
      font-size: var(--fs-xs);
      color: var(--clr-muted);
      font-style: italic;
    }
  </style>
  ```

- [ ] **Step 3: Run a build to verify new pages generate without errors**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npm run build 2>&1 | tail -30
  ```

  Expected: build completes with 0 errors. Look for lines like `tags/index` and `tags/combat` etc. in the output.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/tags/
  git commit -m "feat: add /tags/ index and /tags/[tag]/ pages"
  ```

---

## Task 9: Update power system pages to use `TagBadge`

**Files:**
- Modify: `src/pages/power/[sphere]/index.astro`
- Modify: `src/pages/power/[sphere]/[talent].astro`
- Modify: `src/pages/power/[sphere]/feats/[feat].astro`

The pattern for every page is:
1. Import `TagBadge` and `TagEntry` type
2. Destructure `tagMap` and `bookMetaMap` from `resolveEntries()` in `getStaticPaths`; pass them as props
3. In the component body, destructure `tagMap` and `bookMetaMap` from props
4. Replace `{is3pp(...) && <span class="talent-tag" data-tag="3pp">3PP</span>}` with `{is3pp(...) && <TagBadge tagId="3pp" tagMap={tagMap} bookMetaMap={bookMetaMap} />}`
5. Replace `{entry.tags.map(tag => <span class="talent-tag" data-tag={tag.toLowerCase()}>{tag}</span>)}` with sorted tags using `TagBadge`
6. Remove `is3pp` function/variable (replaced by TagBadge for 3pp)

### `src/pages/power/[sphere]/[talent].astro`

- [ ] **Step 1: Update the talent detail page**

  1. Add imports at the top of the frontmatter:

     ```ts
     import TagBadge from '@/components/TagBadge.astro';
     import type { TagEntry, BookMeta } from '@/lib/types';
     ```

  2. Add `tagMap` and `bookMetaMap` to `Props` interface:

     ```ts
     interface Props {
       talent: TalentEntry;
       sphere: SphereEntry;
       collEntry: any;
       sourceBook: BookMeta | undefined;
       tagMap: Map<string, TagEntry>;
       bookMetaMap: Map<string, BookMeta>;
     }
     ```

  3. In `getStaticPaths`, update the `resolveEntries()` destructure:

     ```ts
     const { talentMap, sphereMap, bookMetaMap, tagMap } = await resolveEntries();
     ```

     Update each `paths.push` to include `tagMap` and `bookMetaMap` in props:

     ```ts
     props: { talent, sphere, collEntry: allCollEntries.get(talent.id), sourceBook: bookMetaMap.get(talent.sourceBook), tagMap, bookMetaMap },
     ```

  4. In the component body, update the destructure:

     ```ts
     const { talent, sphere, collEntry, sourceBook, tagMap, bookMetaMap } = Astro.props;
     ```

  5. Remove the `FIRST_PARTY` and `is3pp` lines:

     ```ts
     // DELETE these two lines:
     const FIRST_PARTY = new Set(['Drop Dead Studios', 'Diamond Recreational Studios']);
     const is3pp = !!sourceBook?.publisher && !FIRST_PARTY.has(sourceBook.publisher);
     ```

  6. In the template, replace the tag rendering block:

     Find:
     ```astro
     {is3pp && <span class="talent-tag" data-tag="3pp">3PP</span>}
     {talent.tags.map(tag => <span class="talent-tag" data-tag={tag.toLowerCase()}>{tag}</span>)}
     ```

     Replace with:
     ```astro
     {sourceBook && !['Drop Dead Studios', 'Diamond Recreational Studios'].includes(sourceBook.publisher ?? '') && (
       <TagBadge tagId="3pp" tagMap={tagMap} bookMetaMap={bookMetaMap} />
     )}
     {[...talent.tags]
       .sort((a, b) => (tagMap.get(a)?.priority ?? 999) - (tagMap.get(b)?.priority ?? 999))
       .map(tagId => <TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />)
     }
     ```

### `src/pages/power/[sphere]/feats/[feat].astro`

- [ ] **Step 2: Update the feat detail page**

  Same changes as the talent page above, substituting `feat` for `talent` throughout:

  1. Add imports:

     ```ts
     import TagBadge from '@/components/TagBadge.astro';
     import type { TagEntry, BookMeta } from '@/lib/types';
     ```

  2. Add `tagMap` and `bookMetaMap` to `Props`:

     ```ts
     interface Props {
       feat: FeatEntry;
       sphere: SphereEntry;
       collEntry: any;
       sourceBook: BookMeta | undefined;
       tagMap: Map<string, TagEntry>;
       bookMetaMap: Map<string, BookMeta>;
     }
     ```

  3. In `getStaticPaths`, destructure `tagMap` from `resolveEntries()` and include in props:

     ```ts
     const { featMap, sphereMap, bookMetaMap, tagMap } = await resolveEntries();
     // ...
     props: { feat, sphere, collEntry: allCollEntries.get(feat.id), sourceBook: bookMetaMap.get(feat.sourceBook), tagMap, bookMetaMap },
     ```

  4. Component body:

     ```ts
     const { feat, sphere, collEntry, sourceBook, tagMap, bookMetaMap } = Astro.props;
     ```

  5. Remove `FIRST_PARTY` and `is3pp` lines.

  6. Replace tag rendering:

     ```astro
     {sourceBook && !['Drop Dead Studios', 'Diamond Recreational Studios'].includes(sourceBook.publisher ?? '') && (
       <TagBadge tagId="3pp" tagMap={tagMap} bookMetaMap={bookMetaMap} />
     )}
     {[...feat.tags]
       .sort((a, b) => (tagMap.get(a)?.priority ?? 999) - (tagMap.get(b)?.priority ?? 999))
       .map(tagId => <TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />)
     }
     ```

### `src/pages/power/[sphere]/index.astro`

- [ ] **Step 3: Update the sphere index page**

  1. Add imports:

     ```ts
     import TagBadge from '@/components/TagBadge.astro';
     import type { TagEntry } from '@/lib/types';
     ```

  2. Add `tagMap` to `Props`:

     ```ts
     interface Props {
       kind: 'sphere' | 'class';
       sphere: SphereEntry | undefined;
       cls: ClassEntry | undefined;
       base: TalentEntry[];
       allTalents: TalentEntry[];
       feats: FeatEntry[];
       sections: SectionResult[];
       mainCollEntry: any;
       talentCollEntries: Map<string, any>;
       featCollEntries: Map<string, any>;
       sourceBook: BookMeta | undefined;
       bookMetaMap: Map<string, BookMeta>;
       tagMap: Map<string, TagEntry>;
     }
     ```

  3. In `getStaticPaths`, update `resolveEntries()` destructure and add `tagMap` to each `paths.push` props.

     ```ts
     const { sphereMap, classMap, talentMap, featMap, bookMetaMap, tagMap } = await resolveEntries();
     ```

     In the sphere loop:
     ```ts
     props: {
       kind: 'sphere' as const,
       sphere, cls: undefined, base, allTalents, feats, sections,
       mainCollEntry: allCollEntries.get(sphere.id),
       talentCollEntries, featCollEntries,
       sourceBook: bookMetaMap.get(sphere.sourceBook),
       bookMetaMap,
       tagMap,
     },
     ```

     In the class loop:
     ```ts
     props: {
       kind: 'class' as const,
       sphere: undefined, cls, base: [], allTalents: [], feats: [], sections: [],
       mainCollEntry: allCollEntries.get(cls.id),
       talentCollEntries: new Map(), featCollEntries: new Map(),
       sourceBook: bookMetaMap.get(cls.sourceBook),
       bookMetaMap,
       tagMap,
     },
     ```

  4. Component body — update destructure and remove `FIRST_PARTY`/`is3pp`:

     ```ts
     const { kind, sphere, cls, base, allTalents, feats, sections, mainCollEntry, talentCollEntries, featCollEntries, sourceBook, bookMetaMap, tagMap } = Astro.props;
     const { talentMap, featMap } = await resolveEntries();
     const entryName = kind === 'sphere' ? sphere!.name : cls!.name;

     const FIRST_PARTY = new Set(['Drop Dead Studios', 'Diamond Recreational Studios']);
     const is3pp = (sbSlug: string) => {
       const pub = bookMetaMap.get(sbSlug)?.publisher;
       return !!pub && !FIRST_PARTY.has(pub);
     };
     ```

     Wait — `is3pp` here takes a `sbSlug` (source book slug), not a publisher directly. We still need it for the sphere index (where `entry.sourceBook` is the slug, not the `BookMeta` directly). Keep the `is3pp` function on this page since it uses a different call signature than the detail pages.

     Instead, just replace the tag rendering. In the talent list, find:

     ```astro
     {is3pp(entry.sourceBook) && <span class="talent-tag" data-tag="3pp">3PP</span>}
     {entry.tags.map(tag => <span class="talent-tag" data-tag={tag.toLowerCase()}>{tag}</span>)}
     ```

     Replace with:

     ```astro
     {is3pp(entry.sourceBook) && <TagBadge tagId="3pp" tagMap={tagMap} bookMetaMap={bookMetaMap} />}
     {[...entry.tags]
       .sort((a, b) => (tagMap.get(a)?.priority ?? 999) - (tagMap.get(b)?.priority ?? 999))
       .map(tagId => <TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />)
     }
     ```

- [ ] **Step 4: Run a build to verify all power pages compile**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npm run build 2>&1 | grep -E "error|Error|warning" | head -20
  ```

  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/power/
  git commit -m "feat: update power pages to use TagBadge with sorted tags"
  ```

---

## Task 10: Update might system pages to use `TagBadge`

**Files:**
- Modify: `src/pages/might/[sphere]/index.astro`
- Modify: `src/pages/might/[sphere]/[talent].astro`
- Modify: `src/pages/might/[sphere]/feats/[feat].astro`

Apply the exact same changes as Task 9, substituting `might` for `power` where relevant. The patterns are identical.

### `src/pages/might/[sphere]/[talent].astro`

- [ ] **Step 1: Update might talent detail page**

  Same changes as power [talent].astro in Task 9 Step 1. Substitute `might` for `power` in system-specific strings (e.g. `talent.system !== 'might'`).

  The tag rendering replacement is identical:

  ```astro
  {sourceBook && !['Drop Dead Studios', 'Diamond Recreational Studios'].includes(sourceBook.publisher ?? '') && (
    <TagBadge tagId="3pp" tagMap={tagMap} bookMetaMap={bookMetaMap} />
  )}
  {[...talent.tags]
    .sort((a, b) => (tagMap.get(a)?.priority ?? 999) - (tagMap.get(b)?.priority ?? 999))
    .map(tagId => <TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />)
  }
  ```

### `src/pages/might/[sphere]/feats/[feat].astro`

- [ ] **Step 2: Update might feat detail page**

  Same as power feats/[feat].astro. Substitute `might` system filter.

### `src/pages/might/[sphere]/index.astro`

- [ ] **Step 3: Update might sphere index page**

  Same as power [sphere]/index.astro. System value is `'might'`.

- [ ] **Step 4: Build check**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npm run build 2>&1 | grep -E "error|Error" | head -20
  ```

  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/might/
  git commit -m "feat: update might pages to use TagBadge with sorted tags"
  ```

---

## Task 11: Update guile system pages to use `TagBadge`

**Files:**
- Modify: `src/pages/guile/[sphere]/index.astro`
- Modify: `src/pages/guile/[sphere]/[talent].astro`
- Modify: `src/pages/guile/[sphere]/feats/[feat].astro`

Apply the exact same changes as Tasks 9–10, substituting `guile` for `power`.

### `src/pages/guile/[sphere]/[talent].astro`

- [ ] **Step 1: Update guile talent detail page** — same as power, substitute `guile`.

### `src/pages/guile/[sphere]/feats/[feat].astro`

- [ ] **Step 2: Update guile feat detail page** — same as power, substitute `guile`.

### `src/pages/guile/[sphere]/index.astro`

- [ ] **Step 3: Update guile sphere index page** — same as power, substitute `guile`.

- [ ] **Step 4: Final full build + test run**

  ```bash
  cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
  npx vitest run && npm run build 2>&1 | tail -30
  ```

  Expected: all tests pass; build completes with 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/guile/
  git commit -m "feat: update guile pages to use TagBadge with sorted tags"
  ```

---

## Self-Review Checklist

After Task 11, verify:

| Spec requirement | Covered by |
|---|---|
| Tag files at `src/content/{book}/tags/{slug}.md` | Tasks 2, 5 |
| `type: "tag"` in discriminated union | Task 2 |
| `TagEntry` with id/label/color/priority/description/sourceBook | Task 1 |
| `tagMap: Map<string, TagEntry>` in `ResolvedMaps` | Tasks 1, 4 |
| `sourceBook` injected from collection slug (not frontmatter) | Task 4 |
| Build-time duplicate detection with error message naming both books | Tasks 3, 4 |
| Default color fallback to `--clr-brand` (CSS var, no JS) | Tasks 6, 7 |
| `color-mix()` for CSS alpha derivation | Task 7 |
| Pure CSS tooltip on hover | Tasks 7, 8 |
| Tooltip shows: label, description, source book title | Task 7 |
| Tags sorted by priority ascending at render sites | Tasks 9–11 |
| Undefined tags: default color, no tooltip (graceful degradation) | Task 7 |
| `3pp` badge: `text-transform: uppercase; letter-spacing: 0.08em` | Task 8 |
| Remove all old `[data-tag="*"]` CSS overrides | Task 8 |
| `/tags/` index page sorted by priority then label | Task 9 |
| `/tags/[slug]/` page grouped by system | Task 9 |
| Only render system groups that have matching entries | Task 9 |
| 10 tag definition files for spheres-of-power-core | Task 5 |
| All 9 sphere/talent/feat pages updated | Tasks 9–11 |
