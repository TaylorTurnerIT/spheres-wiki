# First-Class Tag System Design

**Date:** 2026-05-15  
**Scope:** types.ts, config.ts, resolveEntries.ts, TagBadge.astro, global.css, tags/[tag].astro, tags/index.astro, all sphere index + talent/feat pages, tag content files

## Goal

Elevate tags from bare strings with hardcoded CSS colors into first-class entities: each tag has a definition file inside its source book, carries a label, color, priority, and description, renders a hover tooltip, and has a dedicated index page listing all content with that tag.

## Decisions

| Decision | Choice |
|---|---|
| Tag file location | `src/content/{book}/tags/{slug}.md` |
| Schema integration | `type: "tag"` added to existing discriminated union in `config.ts` |
| Priority direction | 1 = highest priority = leftmost on entry |
| Default color | `--clr-brand` (#990000, site red) |
| Duplicate handling | Build-time error on duplicate `id` across books |
| Tooltip mechanism | Pure CSS `:hover` — no JS |
| Tag page scope | `/tags/[slug]/` global (all systems) |
| Grouping on tag page | By system (Power / Might / Guile) |
| Computation site | Build time — filter in `getStaticPaths`, no client work |
| 3pp badge | Becomes a proper tag definition; rendered through `TagBadge` |
| Undefined tags | Render with default color, no tooltip — graceful degradation |

## Data Model

### `src/lib/types.ts`

```ts
export type TagEntry = {
  type: "tag";
  id: string;          // slug — from filename
  label: string;       // display name, e.g. "Combat"
  color?: string;      // hex color; omit to use --clr-brand (#990000)
  priority: number;    // integer ≥ 1; lower = more important = leftmost
  description: string; // short plain text shown in tooltip
  sourceBook: string;  // injected by resolveEntries from collection slug
};
```

Add to `ResolvedMaps`:
```ts
tagMap: Map<string, TagEntry>;
```

### `src/content/config.ts`

Add to the `z.discriminatedUnion("type", [...])` array:

```ts
z.object({
  type: z.literal("tag"),
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string(),
  color: z.string().optional(),
  priority: z.number().int().min(1),
  description: z.string(),
}),
```

### Tag Definition Files

File: `src/content/{book}/tags/{slug}.md`

```yaml
---
type: tag
id: body
label: "Body"
color: "#1a6622"
priority: 3
description: "Grants traits that mimic a specific creature type, such as limbs, natural attacks, or special senses."
---

Optional extended markdown body. Shown only on the /tags/body/ page. May include rules clarifications, cross-references, etc.
```

`sourceBook` is NOT written in the file — `resolveEntries` injects it from the collection slug automatically.

### Existing Tags to Define

All files go in `src/content/spheres-of-power-core/tags/`:

| slug | label | color | priority | description |
|---|---|---|---|---|
| `combat` | Combat | #8f2d00 | 1 | Modifies or interacts with the combat rules. |
| `dual-sphere` | Dual-Sphere | #3c0078 | 2 | Requires or references talents from another sphere. |
| `body` | Body | #1a6622 | 3 | Grants traits that mimic a specific creature type. |
| `transformation` | Transformation | #174b93 | 4 | Grants additional transformation forms or modes. |
| `utility` | Utility | #5a2d96 | 5 | General-purpose ability with broad non-combat applications. |
| `instill` | Instill | #8a5500 | 6 | Applied as an effect instilled into a target or object. |
| `mass` | Mass | #006478 | 7 | Affects multiple targets simultaneously. |
| `range` | Range | #8f2d00 | 8 | Modifies the range of an ability. |
| `strike` | Strike | #990000 | 9 | Delivered as or combined with a weapon strike. |
| `3pp` | 3PP | #7a4200 | 10 | Content from a third-party publisher. |

## `resolveEntries` Changes

In `src/lib/resolveEntries.ts`:

1. Initialize `tagMap = new Map<string, TagEntry>()`
2. In the per-entry loop, when `entry.type === "tag"`:
   - If `tagMap.has(entry.id)` → throw `Error: Duplicate tag "${entry.id}" defined in both "${tagMap.get(entry.id)!.sourceBook}" and "${collectionSlug}"`
   - Otherwise set `tagMap.set(entry.id, { ...entry, sourceBook: collectionSlug })`
3. Return `tagMap` in the `ResolvedMaps` result

## `TagBadge` Component

**File:** `src/components/TagBadge.astro`

```ts
interface Props {
  tagId: string;
  tagMap: Map<string, TagEntry>;
}
```

Behavior:
- Look up `tag = tagMap.get(tagId)`
- If found: render badge with `style="--tag-clr: {tag.color ?? 'var(--clr-brand)'}"` and a tooltip `<div>`
- If not found: render badge with no inline style (falls back to CSS default = `--clr-brand`), no tooltip

HTML structure:
```html
<span class="tag-wrapper">
  <span class="talent-tag" data-tag={tagId} style="--tag-clr: {color}">
    {tag?.label ?? tagId}
  </span>
  {tag && (
    <div class="tag-tooltip" role="tooltip">
      <p class="tag-tooltip-name">{tag.label}</p>
      <p class="tag-tooltip-desc">{tag.description}</p>
      <p class="tag-tooltip-source">{tag.sourceBook}</p>
    </div>
  )}
</span>
```

Tags are sorted by `priority` (ascending) before rendering. Sorting happens at the call site where `entry.tags` is mapped — sort by `tagMap.get(id)?.priority ?? 999` so undefined tags sort last.

The `3pp` badge (currently a special-case `{is3pp(...) && <span>}`) is replaced by passing `"3pp"` through `TagBadge` when `is3pp()` returns true.

## CSS Changes

### `src/styles/global.css`

**Remove** all `[data-tag="*"]` overrides (lines 1436–1487 in current file).

**Keep** the base `.talent-tag` rule, update color properties to use the CSS variable:

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

**Special case for 3pp** — keep `text-transform: uppercase; letter-spacing: 0.08em` via `[data-tag="3pp"]` since it's a display exception, not a color exception:

```css
.talent-tag[data-tag="3pp"] {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

**Add tooltip styles:**

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

## Tag Pages

### `src/pages/tags/[tag].astro`

`getStaticPaths`: iterate `tagMap`, return one path per tag. At build time filter all talents, feats, and spheres by tag presence, group by system.

Page layout:
- `<div class="page-title">` with `<TagBadge>` (large) + label
- Description paragraph
- Extended body content (rendered from `.md` body if present)
- Source book credit (subtle, same style as `extBook` on talent headers)
- Sections per system (only rendered if system has matching entries):
  - "Spheres of Power", "Spheres of Might", "Spheres of Guile"
  - Compact entry rows: entry name (link) + entry type badge + sphere name
- Empty state if no entries exist yet

### `src/pages/tags/index.astro`

Lists all defined tags sorted by priority ascending, then label alphabetically within same priority. Each tag shown as a `<TagBadge>` linking to its page with a one-line description beside it.

## Pages to Update

All pages below: destructure `tagMap` from `resolveEntries()`, pass to `TagBadge`, replace inline `<span class="talent-tag">` + `is3pp` badge with `<TagBadge>`.

| Page | Change |
|---|---|
| `src/pages/power/[sphere]/index.astro` | `tagMap` from resolveEntries; sort + TagBadge |
| `src/pages/power/[sphere]/[talent].astro` | Same |
| `src/pages/power/[sphere]/feats/[feat].astro` | Same |
| `src/pages/might/[sphere]/index.astro` | Same |
| `src/pages/might/[sphere]/[talent].astro` | Same |
| `src/pages/might/[sphere]/feats/[feat].astro` | Same |
| `src/pages/guile/[sphere]/index.astro` | Same |
| `src/pages/guile/[sphere]/[talent].astro` | Same |
| `src/pages/guile/[sphere]/feats/[feat].astro` | Same |

## Out of Scope

- Tags on `ClassEntry` or `ArticleEntry` pages (no tag badges rendered there currently)
- Champions system tag support
- Tag filtering/search UI on listing pages
- Tag editing UI
