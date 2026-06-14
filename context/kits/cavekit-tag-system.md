---
name: tag-system
description: Tag system overhaul — auto-add system tags (might/power/guile/champions) from path, add hidden:boolean to tag definition files so sphere-identity tags are hidden by default but can be shown contextually
metadata:
  type: project
  created: "2026-06-14"
  last_edited: "2026-06-14"
---

# Cavekit: Tag System Overhaul

## Scope

Three changes to the tag system:

1. **System auto-tags** — `might`, `power`, `guile`, `champions` added automatically
   from the path-inferred `system` field. No manual tagging required.
2. **`hidden` property on tag definitions** — tag `.md` files gain an optional
   `hidden: boolean` field. Tags marked `hidden: true` are excluded from default
   display.
3. **Render layer update** — `buildOrderedTagIds` and call sites updated so hidden
   tags are filtered unless the caller passes `{ showHidden: true }`.

Related kit: [[dir-truth-overview]], [[dir-validation]].

## Current auto-tags (already in `src/lib/tags.ts`)

| Tag | Trigger |
|---|---|
| `talent` / `feat` / `sphere` / `class-trait` | `entry.type` |
| `base` / `basic` / `advanced` | `entry.tier` |
| `3pp` | publisher ∉ {Drop Dead Studios, Diamond Recreational Studios} |
| `dual-sphere` | `entry.dualSphere` present and ≠ `"any"` |
| `[sphere]-sphere` | `entry.sphere` (conditional: only if multi-sphere or `includeSphere`) |
| `[dualSphere]-sphere` | `entry.dualSphere` (always when present) |

## Requirements

### R1: System Auto-Tags

**File:** `src/lib/tags.ts` → `buildOrderedTagIds`

Add after existing type-based tags:

```ts
if (entry.system) tags.add(entry.system); // "might" | "power" | "guile" | "champions"
```

Tag definition files for `might`, `power`, `guile`, `champions` must exist in
`src/content/__built-in__/tags/` with `hidden: false` (visible by default — useful
for filtering the entries list).

**Acceptance criteria:**
- Every talent/sphere/feat with `system: might` gets `might` tag in resolved set.
- Tag definition file exists for each system tag.
- No manual `tags: [might]` in any frontmatter (auto-added removes the need).

### R2: Hidden Tag Property

**Files:**
- `src/content.config.ts` — add `hidden: z.boolean().optional()` to tag schema
- `src/lib/types.ts` — add `hidden?: boolean` to `TagEntry`
- All `[sphere]-sphere` tag definition files — add `hidden: true`

**Tag definition file shape (after):**
```yaml
---
type: tag
id: alteration-sphere
label: Alteration Sphere
priority: 10
description: "..."
hidden: true      # ← new field
---
```

**Which tags get `hidden: true`:**
- All `[sphere]-sphere` tags (e.g. `alteration-sphere`, `athletics-sphere`, etc.)
  — these identify sphere membership, clutter tag strips on single-sphere entries,
  but are needed on dual-sphere feats.

**Which tags stay `hidden: false` (default):**
- `talent`, `feat`, `sphere`, `class-trait`
- `base`, `basic`, `advanced`
- `3pp`, `dual-sphere`
- `might`, `power`, `guile`, `champions`
- All manual subcategory tags (admixture, formulae, toxin, blitz, etc.)

**Acceptance criteria:**
- `hidden` field present on `TagEntry` type.
- All `[sphere]-sphere` tag definition files have `hidden: true`.
- `hidden` defaults to `false` / `undefined` for all other tags.

### R3: Render Layer Update

**File:** `src/lib/tags.ts` → `buildOrderedTagIds`

Change signature:
```ts
function buildOrderedTagIds(
  entry: AnyEntry,
  bookMetaMap: Map<string, BookMeta>,
  tagMap: Map<string, TagEntry>,
  options?: {
    includeSphere?: boolean;   // existing — kept for back-compat
    currentSphereId?: string;  // existing
    showHidden?: boolean;      // NEW — if true, include hidden tags
  },
): string[]
```

Before returning:
```ts
return Array.from(tags)
  .filter(id => options?.showHidden || !(tagMap.get(id)?.hidden))
  .sort((a, b) => { ... }); // existing sort
```

**Call sites that should pass `showHidden: true`:**
- Dual-sphere feat detail page — needs both sphere tags visible.
- Any future "full tag view" or admin page.

**Call sites that keep default (hidden filtered):**
- Talent list rows, sphere TOC, tag badge strips in cards.

**Acceptance criteria:**
- Default call (no options) never returns a tag with `hidden: true`.
- Call with `{ showHidden: true }` returns all tags including hidden.
- Existing `includeSphere` behavior unchanged.
- Dual-sphere feat page renders both sphere tags in the tag strip.
- Single-sphere talent page does NOT render its `[sphere]-sphere` tag.

## Migration: Existing `includeSphere` option

Current: `[sphere]-sphere` conditionally included via `includeSphere || isMultiSphere`.
After: `[sphere]-sphere` always included in the full tag set, but filtered by `hidden`.
`includeSphere` option removed — replaced by `showHidden`.

The `isMultiSphere` path that checks `userTags.some(id => id.endsWith('-sphere'))`
is also removed — no longer needed since hidden filtering handles suppression.
