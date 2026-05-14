# Hierarchical Categorization Design

**Date:** 2026-05-14  
**Scope:** Types, categorize.ts, sphere YAML, sphere index pages (power/might/guile), TableOfContents.astro, global.css

## Goal

Transform the flat `categoryDefinitions` system into a two-level hierarchy: top-level **sections** (Talents, Feats, Archetypes) containing **categories** (Body Talents, Combat Feats, etc.). The TOC reflects this hierarchy with always-visible group labels and scroll-driven collapse/expand on subcategories.

## Decisions

| Decision | Choice |
|---|---|
| Schema field name | `sectionDefinitions` (replaces `categoryDefinitions`) |
| Empty section | Show section header + "No entries yet" |
| Empty category | Show category header + "No entries yet" |
| TOC group behavior | Always expanded (static labels, no collapse) |
| TOC subcategory behavior | Collapse/expand with scroll — unchanged from current |
| Page group header style | Full-width styled divider (label + horizontal rule) |
| Archetypes | Section with no `categories` — placeholder for future class content |

## Data Model

### `src/lib/types.ts`

Add `SectionDefinition`. Remove `categoryDefinitions` from `SphereEntry`, add `sectionDefinitions`:

```ts
// New — top-level section containing categories
export type SectionDefinition = {
  label: string;
  categories?: TalentCategory[]; // omit for flat sections (e.g., Archetypes)
};

// Updated SphereEntry field
// REMOVE: categoryDefinitions?: TalentCategory[];
// ADD:
sectionDefinitions?: SectionDefinition[];
```

`TalentCategory` is unchanged — still used inside `SectionDefinition.categories`.

### `src/lib/categorize.ts`

New return type `SectionResult`:

```ts
export type SectionResult = {
  label: string;
  id: string;                  // kebab-case of label
  categories: CategoryResult[]; // always present; may be empty
};
```

`CategoryResult` is unchanged.

### `src/components/TableOfContents.astro`

New exported interface `TocGroup`. Props change from `items[]` to `overview + groups[]`:

```ts
export interface TocGroup {
  label: string;
  categories: TocItem[]; // each TocItem has sub[] of individual entries
}

interface Props {
  overview: TocItem;   // Overview section (unchanged structure)
  groups: TocGroup[];  // Sections with their subcategories
  system: 'power' | 'might' | 'guile' | 'champ';
}
```

## `buildSections` Function

Replaces `buildCategories` in `src/lib/categorize.ts`.

**Signature:**
```ts
export function buildSections(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[],
): SectionResult[]
```

**Logic:**

1. Extract a private `filterEntries(def, talents, feats, usedIds)` helper containing the existing tag/tier/excludeTag filtering logic (DRYs the current 3× repeated loop).

2. For each `SectionDefinition` in `sphere.sectionDefinitions`:
   - If `def.categories` present: run `filterEntries` per category, build `CategoryResult[]`
   - If `def.categories` absent: push section with empty `categories: []`
   - Always push the section (even if empty — page handles "No entries yet")

3. Catch-alls: after processing all sections, collect remaining unmatched basic talents, advanced talents, and feats. If any remain, append a catch-all `SectionResult` with label `"Other"` and id `"other"` containing the standard "Basic Talents" / "Advanced Talents" / "Feats" `CategoryResult` buckets (same as current behavior). If nothing remains, no catch-all section is appended.

4. Sort entries within each `CategoryResult` by `id` (existing behavior, unchanged).

**No `sectionDefinitions`:** If `sphere.sectionDefinitions` is absent or empty, fall through to catch-all logic only — same output as current `buildCategories`.

## YAML Migration — `alteration.md`

Replace `categoryDefinitions` with `sectionDefinitions`:

```yaml
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Body Talents"
        tiers: ["basic"]
        tags: ["body"]
      - label: "Transformation Talents"
        tiers: ["basic"]
        tags: ["transformation"]
      - label: "Alteration Talents"
        tiers: ["basic"]
        excludeTags: ["body", "transformation"]
      - label: "Advanced Alteration Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Feats"
        tiers: ["feat"]
        excludeTags: ["combat", "dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
  - label: "Archetypes"
    # no categories — placeholder for future class content
```

Only `alteration.md` exists currently. All other sphere files use the catch-all path and require no migration.

## Page Rendering

All three sphere index pages (`power/[sphere]/index.astro`, `might/[sphere]/index.astro`, `guile/[sphere]/index.astro`) change from:

```ts
const categories = buildCategories(sphere, allTalents, feats);
```

to:

```ts
const sections = buildSections(sphere, allTalents, feats);
```

Template changes from a single `categories.map` to nested `sections.map → categories.map`:

```astro
{sections.map(sec => (
  <div class="section-group">
    <div class="section-group-header">
      <span class="section-group-label">{sec.label}</span>
      <div class="section-group-rule"></div>
    </div>

    {sec.categories.map(cat => (
      <div class="section-block">
        <div class="section-heading">
          <span class="section-heading-text" id={cat.id}>{cat.label}</span>
          <div class="section-heading-rule"></div>
        </div>

        {cat.entries.length === 0
          ? <p class="section-empty">No entries yet.</p>
          : <div class="talent-list">
              {cat.entries.map(e => /* existing talent-entry render — unchanged */)}
            </div>
        }
      </div>
    ))}

    {sec.categories.length === 0 && (
      <p class="section-empty">No entries yet.</p>
    )}
  </div>
))}
```

### TOC construction

```ts
const overview: TocItem = {
  id: 'overview',
  label: 'Overview',
  sub: base.length > 0 ? base.map(t => ({ id: t.id, label: t.name })) : undefined,
};

const groups: TocGroup[] = sections.map(sec => ({
  label: sec.label,
  categories: sec.categories.map(cat => ({
    id: cat.id,
    label: cat.label,
    sub: cat.entries.map(e => {
      const talent = talentMap.get(e.id);
      const feat = featMap.get(e.id);
      return { id: e.id, label: talent?.name ?? feat?.name ?? e.id };
    }),
  })),
}));
```

Pass to component: `<TableOfContents overview={overview} groups={groups} system="power" />`

## TOC Component

### HTML structure

```html
<nav class="toc" aria-label="On this page" style="--clr-system: var(--clr-{system})">
  <p class="toc-title">On This Page</p>
  <ul class="toc-list">

    <!-- Overview: unchanged collapse/expand behavior -->
    <li class="toc-category" data-toc-section="overview">
      <a href="#overview" class="toc-cat-link">Overview</a>
      <div class="toc-sub-list">
        <div class="toc-sub-inner">
          <!-- base ability links -->
        </div>
      </div>
    </li>

    <!-- Groups: static, always visible -->
    {groups.map(group => (
      <li class="toc-group">
        <span class="toc-group-label">{group.label}</span>
        <ul class="toc-group-categories">
          {group.categories.map(cat => (
            <li class="toc-category" data-toc-section={cat.id}>
              <a href={`#${cat.id}`} class="toc-cat-link">{cat.label}</a>
              <div class="toc-sub-list">
                <div class="toc-sub-inner">
                  {cat.sub?.map(s => (
                    <a href={`#${s.id}`} data-toc-item={s.id}>{s.label}</a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </li>
    ))}

  </ul>
</nav>
```

### Script

No changes to the Intersection Observer logic. It still selects `[data-toc-section]` elements — these are now nested inside `.toc-group-categories` but the query is document-wide so nesting doesn't matter.

### CSS additions (`global.css`)

```css
.toc-group {
  margin-top: 8px;
}
.toc-group-label {
  display: block;
  font-size: var(--fs-3xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--clr-muted);
  margin-bottom: 4px;
}
.toc-group-categories {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* Page group header (Style A) */
.section-group {
  margin-top: 32px;
}
.section-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.section-group-label {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
  color: var(--clr-text);
}
.section-group-rule {
  flex: 1;
  height: 1px;
  background: var(--clr-border);
}
.section-empty {
  font-size: var(--fs-xs);
  color: var(--clr-muted);
  font-style: italic;
  margin: 8px 0;
}
```

## Affected Files

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `SectionDefinition`, update `SphereEntry` |
| `src/lib/categorize.ts` | Add `SectionResult`, add `buildSections`, extract `filterEntries` helper |
| `src/content/spheres-of-power-core/spheres/alteration.md` | Migrate to `sectionDefinitions` |
| `src/components/TableOfContents.astro` | Add `TocGroup`, update props, update template |
| `src/pages/power/[sphere]/index.astro` | Use `buildSections`, nested render, new TOC props |
| `src/pages/might/[sphere]/index.astro` | Same |
| `src/pages/guile/[sphere]/index.astro` | Same |
| `src/styles/global.css` | Add `.toc-group*`, `.section-group*`, `.section-empty` |

## Out of Scope

- Archetype/class content type (no content files exist yet)
- Champions system (no sphere index page uses this pattern currently)
- Removing `buildCategories` export until all callers migrated (keep as deprecated alias initially)
