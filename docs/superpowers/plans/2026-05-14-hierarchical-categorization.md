# Hierarchical Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the flat `categoryDefinitions` system into a two-level hierarchy — top-level sections (Talents, Feats, Archetypes) containing subcategories — with matching TOC and page rendering changes.

**Architecture:** Add `SectionDefinition` type and `buildSections` function (which extracts a private `filterEntries` helper to DRY the existing 3× loop). Update `TableOfContents.astro` props from a flat `items[]` to `overview + groups[]`. Update all three sphere index pages to call `buildSections`, render nested sections, and pass the new TOC shape.

**Tech Stack:** Astro 4.x, TypeScript, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `SectionDefinition`; add `sectionDefinitions?` to `SphereEntry` |
| `src/lib/categorize.ts` | Add `SectionResult`; add `buildSections`; extract `filterEntries`; keep `buildCategories` export |
| `tests/lib/categorize.test.ts` | New — unit tests for `buildSections` |
| `src/content/spheres-of-power-core/spheres/alteration.md` | Replace `categoryDefinitions` YAML with `sectionDefinitions` |
| `src/styles/global.css` | Add `.toc-group*`, `.section-group*`, `.section-empty` rules |
| `src/components/TableOfContents.astro` | Add `TocGroup`; update props to `overview + groups[]`; update template |
| `src/pages/power/[sphere]/index.astro` | Use `buildSections`; nested render; new TOC props |
| `src/pages/might/[sphere]/index.astro` | Same as power (system: might) |
| `src/pages/guile/[sphere]/index.astro` | Same as power (system: guile) |

---

### Task 1: Add `SectionDefinition` type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `SectionDefinition` and update `SphereEntry`**

In `src/lib/types.ts`, add the new type after `TalentCategory` and add `sectionDefinitions?` to `SphereEntry`. Keep `categoryDefinitions?` — it is still referenced by the deprecated `buildCategories` export.

Replace the `SphereEntry` block:

```ts
export type SectionDefinition = {
  label: string;
  categories?: TalentCategory[];
};

export type SphereEntry = {
  type: "sphere";
  id: string;
  system: string;
  name: string;
  icon: string;
  sourceBook: string;
  tags: string[];
  modifies?: string;
  categoryDefinitions?: TalentCategory[];
  sectionDefinitions?: SectionDefinition[];
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd spheres-wiki && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add SectionDefinition type to types.ts"
```

---

### Task 2: Add `buildSections` with tests

**Files:**
- Create: `tests/lib/categorize.test.ts`
- Modify: `src/lib/categorize.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/categorize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSections } from '../../src/lib/categorize';
import type { SphereEntry, TalentEntry, FeatEntry } from '../../src/lib/types';

function makeSphere(overrides: Partial<SphereEntry> = {}): SphereEntry {
  return {
    type: 'sphere',
    id: 'test-sphere',
    system: 'power',
    name: 'Test Sphere',
    icon: 'test',
    sourceBook: 'core',
    tags: [],
    ...overrides,
  };
}

function makeTalent(id: string, tier: 'basic' | 'advanced', tags: string[] = []): TalentEntry {
  return {
    type: 'talent',
    id,
    sphere: 'test-sphere',
    system: 'power',
    tier,
    name: id,
    sourceBook: 'core',
    tags,
  };
}

function makeFeat(id: string, tags: string[] = []): FeatEntry {
  return {
    type: 'feat',
    id,
    sphere: 'test-sphere',
    system: 'power',
    name: id,
    sourceBook: 'core',
    tags,
  };
}

describe('buildSections', () => {
  it('no sectionDefinitions → single Other section with catch-all categories', () => {
    const sphere = makeSphere();
    const talents = [makeTalent('alpha', 'basic'), makeTalent('beta', 'advanced')];
    const feats = [makeFeat('gamma-feat')];
    const sections = buildSections(sphere, talents, feats);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('other');
    expect(sections[0].label).toBe('Other');
    expect(sections[0].categories).toHaveLength(3);
    expect(sections[0].categories[0].id).toBe('basic-talents');
    expect(sections[0].categories[1].id).toBe('advanced-talents');
    expect(sections[0].categories[2].id).toBe('feats');
  });

  it('no sectionDefinitions, no talents, no feats → no sections', () => {
    const sections = buildSections(makeSphere(), [], []);
    expect(sections).toHaveLength(0);
  });

  it('sectionDefinitions with categories → maps entries into categories', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [
            { label: 'Body Talents', tiers: ['basic'], tags: ['body'] },
            { label: 'Other Talents', tiers: ['basic'] },
          ],
        },
      ],
    });
    const talents = [
      makeTalent('arm', 'basic', ['body']),
      makeTalent('leg', 'basic', ['body']),
      makeTalent('zap', 'basic'),
    ];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(1);
    const sec = sections[0];
    expect(sec.label).toBe('Talents');
    expect(sec.id).toBe('talents');
    expect(sec.categories).toHaveLength(2);

    const body = sec.categories[0];
    expect(body.label).toBe('Body Talents');
    expect(body.entries.map(e => e.id)).toEqual(['arm', 'leg']);

    const other = sec.categories[1];
    expect(other.entries.map(e => e.id)).toEqual(['zap']);
  });

  it('section with no categories field → section with empty categories array', () => {
    const sphere = makeSphere({
      sectionDefinitions: [{ label: 'Archetypes' }],
    });
    const sections = buildSections(sphere, [], []);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe('Archetypes');
    expect(sections[0].categories).toEqual([]);
  });

  it('empty category → included with empty entries array', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'Body Talents', tiers: ['basic'], tags: ['body'] }],
        },
      ],
    });
    const sections = buildSections(sphere, [makeTalent('zap', 'basic')], []);
    expect(sections[0].categories[0].entries).toHaveLength(0);
  });

  it('unmatched entries land in Other catch-all appended after defined sections', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'Body Talents', tiers: ['basic'], tags: ['body'] }],
        },
      ],
    });
    const talents = [makeTalent('arm', 'basic', ['body']), makeTalent('zap', 'basic')];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(2);
    const other = sections[1];
    expect(other.id).toBe('other');
    expect(other.categories[0].entries.map(e => e.id)).toEqual(['zap']);
  });

  it('entries sorted by id within each category', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'All', tiers: ['basic'] }],
        },
      ],
    });
    const talents = [makeTalent('zeta', 'basic'), makeTalent('alpha', 'basic'), makeTalent('mid', 'basic')];
    const sections = buildSections(sphere, talents, []);
    expect(sections[0].categories[0].entries.map(e => e.id)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('each entry claimed by first matching category only', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [
            { label: 'Body', tiers: ['basic'], tags: ['body'] },
            { label: 'All Basic', tiers: ['basic'] },
          ],
        },
      ],
    });
    const talents = [makeTalent('arm', 'basic', ['body'])];
    const sections = buildSections(sphere, talents, []);
    const cats = sections[0].categories;
    expect(cats[0].entries).toHaveLength(1);
    expect(cats[1].entries).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd spheres-wiki && npm test -- tests/lib/categorize.test.ts
```

Expected: FAIL — `buildSections` not exported from categorize.ts.

- [ ] **Step 3: Add `SectionResult`, `filterEntries`, `buildSections` to `src/lib/categorize.ts`**

Add `SectionResult` after the `CategoryResult` type:

```ts
export type SectionResult = {
  label: string;
  id: string;
  categories: CategoryResult[];
};
```

Add the `filterEntries` private helper and `buildSections` function after `buildCategories`. Add the import for `SectionDefinition` at the top:

```ts
import type {
  TalentEntry,
  FeatEntry,
  SphereEntry,
  TalentCategory,
  SectionDefinition,
} from "./types";
```

Then add after the closing `}` of `buildCategories`:

```ts
function filterEntries(
  def: TalentCategory,
  basicTalents: TalentEntry[],
  advancedTalents: TalentEntry[],
  feats: FeatEntry[],
  usedIds: Set<string>,
): Array<{ id: string; type: "talent" | "feat" }> {
  const entries: Array<{ id: string; type: "talent" | "feat" }> = [];

  for (const t of basicTalents) {
    if (usedIds.has(t.id)) continue;
    const tierMatch = !def.tiers || def.tiers.includes("basic");
    const tagMatch = !def.tags || def.tags.some((tag) => t.tags.includes(tag));
    const excludeMatch = !def.excludeTags || !def.excludeTags.some((tag) => t.tags.includes(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: t.id, type: "talent" });
      usedIds.add(t.id);
    }
  }

  for (const t of advancedTalents) {
    if (usedIds.has(t.id)) continue;
    const tierMatch = !def.tiers || def.tiers.includes("advanced");
    const tagMatch = !def.tags || def.tags.some((tag) => t.tags.includes(tag));
    const excludeMatch = !def.excludeTags || !def.excludeTags.some((tag) => t.tags.includes(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: t.id, type: "talent" });
      usedIds.add(t.id);
    }
  }

  for (const f of feats) {
    if (usedIds.has(f.id)) continue;
    const tierMatch = !def.tiers || def.tiers.includes("feat");
    const tagMatch = !def.tags || def.tags.some((tag) => f.tags.includes(tag));
    const excludeMatch = !def.excludeTags || !def.excludeTags.some((tag) => f.tags.includes(tag));
    if (tierMatch && tagMatch && excludeMatch) {
      entries.push({ id: f.id, type: "feat" });
      usedIds.add(f.id);
    }
  }

  return entries;
}

export function buildSections(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[],
): SectionResult[] {
  const sections: SectionResult[] = [];
  const usedIds = new Set<string>();

  const basicTalents = talents.filter((t) => t.tier === "basic");
  const advancedTalents = talents.filter((t) => t.tier === "advanced");

  if (sphere.sectionDefinitions && sphere.sectionDefinitions.length > 0) {
    for (const secDef of sphere.sectionDefinitions) {
      const secId = secDef.label.toLowerCase().replace(/\s+/g, "-");
      const categories: CategoryResult[] = [];

      if (secDef.categories && secDef.categories.length > 0) {
        for (const catDef of secDef.categories) {
          const catEntries = filterEntries(catDef, basicTalents, advancedTalents, feats, usedIds);
          categories.push({
            label: catDef.label,
            id: catDef.label.toLowerCase().replace(/\s+/g, "-"),
            entries: catEntries.sort((a, b) => a.id.localeCompare(b.id)),
          });
        }
      }

      sections.push({ label: secDef.label, id: secId, categories });
    }
  }

  // Catch-all: unmatched entries → "Other" section
  const remainingBasic = basicTalents.filter((t) => !usedIds.has(t.id));
  const remainingAdvanced = advancedTalents.filter((t) => !usedIds.has(t.id));
  const remainingFeats = feats.filter((f) => !usedIds.has(f.id));

  if (remainingBasic.length > 0 || remainingAdvanced.length > 0 || remainingFeats.length > 0) {
    const otherCategories: CategoryResult[] = [];
    if (remainingBasic.length > 0) {
      otherCategories.push({
        label: "Basic Talents",
        id: "basic-talents",
        entries: remainingBasic
          .map((t) => ({ id: t.id, type: "talent" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    if (remainingAdvanced.length > 0) {
      otherCategories.push({
        label: "Advanced Talents",
        id: "advanced-talents",
        entries: remainingAdvanced
          .map((t) => ({ id: t.id, type: "talent" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    if (remainingFeats.length > 0) {
      otherCategories.push({
        label: "Feats",
        id: "feats",
        entries: remainingFeats
          .map((f) => ({ id: f.id, type: "feat" as const }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      });
    }
    sections.push({ label: "Other", id: "other", categories: otherCategories });
  }

  return sections;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd spheres-wiki && npm test -- tests/lib/categorize.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Run full test suite — verify no regressions**

```bash
cd spheres-wiki && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/categorize.ts tests/lib/categorize.test.ts
git commit -m "feat: add buildSections with filterEntries helper and unit tests"
```

---

### Task 3: Migrate alteration.md YAML

**Files:**
- Modify: `src/content/spheres-of-power-core/spheres/alteration.md`

- [ ] **Step 1: Replace `categoryDefinitions` with `sectionDefinitions`**

Replace the frontmatter YAML block. The new frontmatter should be:

```yaml
---
id: alteration
name: Alteration
system: power
type: sphere
icon: alteration
tags: []
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
---
```

Leave the body content (everything after the closing `---`) unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd spheres-wiki && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/content/spheres-of-power-core/spheres/alteration.md
git commit -m "feat: migrate alteration.md to sectionDefinitions YAML"
```

---

### Task 4: Add CSS rules

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add page section-group rules after `.section-heading-rule` block (around line 327)**

Insert after the `.section-heading-rule { ... }` closing brace:

```css
/* ── Hierarchical section group (page) ─────────────────── */
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
.section-block {
  margin-top: 18px;
}
.section-empty {
  font-size: var(--fs-xs);
  color: var(--clr-muted);
  font-style: italic;
  margin: 8px 0;
}
```

- [ ] **Step 2: Add TOC group rules after `.toc-sub-list a.is-current { ... }` block (around line 1658)**

Insert after the `.toc-sub-list a.is-current { ... }` closing brace:

```css
/* ── TOC hierarchy: group labels ───────────────────────── */
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
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add section-group and toc-group CSS for hierarchy"
```

---

### Task 5: Update `TableOfContents.astro`

**Files:**
- Modify: `src/components/TableOfContents.astro`

- [ ] **Step 1: Rewrite the component**

Replace the entire file content with:

```astro
---
export interface TocItem {
  id: string;
  label: string;
  sub?: Array<{ id: string; label: string }>;
}

export interface TocGroup {
  label: string;
  categories: TocItem[];
}

interface Props {
  overview: TocItem;
  groups: TocGroup[];
  system: 'power' | 'might' | 'guile' | 'champ';
}

const { overview, groups, system } = Astro.props;
---
<nav class="toc" aria-label="On this page" style={`--clr-system: var(--clr-${system})`}>
  <p class="toc-title">On This Page</p>
  <ul class="toc-list">

    <li class="toc-category" data-toc-section={overview.id}>
      <a href={`#${overview.id}`} class="toc-cat-link">{overview.label}</a>
      {overview.sub && overview.sub.length > 0 && (
        <div class="toc-sub-list">
          <div class="toc-sub-inner">
            {overview.sub.map(s => (
              <a href={`#${s.id}`} data-toc-item={s.id}>{s.label}</a>
            ))}
          </div>
        </div>
      )}
    </li>

    {groups.map(group => (
      <li class="toc-group">
        <span class="toc-group-label">{group.label}</span>
        <ul class="toc-group-categories">
          {group.categories.map(cat => (
            <li class="toc-category" data-toc-section={cat.id}>
              <a href={`#${cat.id}`} class="toc-cat-link">{cat.label}</a>
              {cat.sub && cat.sub.length > 0 && (
                <div class="toc-sub-list">
                  <div class="toc-sub-inner">
                    {cat.sub.map(s => (
                      <a href={`#${s.id}`} data-toc-item={s.id}>{s.label}</a>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </li>
    ))}

  </ul>
</nav>

<script>
let activeObserver: IntersectionObserver | null = null;
let activeScrollHandler: (() => void) | null = null;

document.addEventListener('astro:page-load', () => {
  activeObserver?.disconnect();
  activeObserver = null;
  if (activeScrollHandler) {
    window.removeEventListener('scroll', activeScrollHandler);
    activeScrollHandler = null;
  }

  const nav = document.querySelector<HTMLElement>('.toc');
  if (!nav) return;

  const categories = [...nav.querySelectorAll<HTMLElement>('[data-toc-section]')];
  const headings = categories
    .map(cat => ({
      cat,
      heading: document.getElementById(cat.dataset.tocSection!),
      subLinks: [...cat.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')],
    }))
    .filter((s): s is typeof s & { heading: HTMLElement } => s.heading !== null);

  function setActive(active: HTMLElement | null) {
    categories.forEach(cat => {
      const subList = cat.querySelector<HTMLElement>('.toc-sub-list');
      const inner = cat.querySelector<HTMLElement>('.toc-sub-inner');
      const isActive = cat === active;
      cat.classList.toggle('is-active', isActive);
      if (subList && inner) {
        subList.style.maxHeight = isActive ? inner.scrollHeight + 'px' : '0';
      }
    });
  }

  const allSubLinks = [...nav.querySelectorAll<HTMLAnchorElement>('[data-toc-item]')];

  function recalc() {
    // Last category heading at or above 25% of viewport = active section
    let current: HTMLElement | null = headings[0]?.cat ?? null;
    for (const { cat, heading } of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.25) {
        current = cat;
      }
    }
    setActive(current);

    // Last sub-item at or above 15% of viewport = currently reading
    let activeSub: HTMLAnchorElement | null = null;
    for (const { subLinks } of headings) {
      for (const link of subLinks) {
        const el = document.getElementById(link.dataset.tocItem!);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.15) {
          activeSub = link;
        }
      }
    }
    allSubLinks.forEach(l => l.classList.toggle('is-current', l === activeSub));
  }

  // IO triggers recalc when category headings cross viewport boundary
  activeObserver = new IntersectionObserver(recalc, {
    rootMargin: '-5% 0px -5% 0px',
    threshold: [0, 1],
  });
  headings.forEach(({ heading }) => activeObserver!.observe(heading));

  // Scroll listener catches click-jump navigation that IO may miss
  let rafPending = false;
  activeScrollHandler = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      recalc();
      rafPending = false;
    });
  };
  window.addEventListener('scroll', activeScrollHandler, { passive: true });

  recalc();
});
</script>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd spheres-wiki && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TableOfContents.astro
git commit -m "feat: update TableOfContents to overview + groups[] hierarchy props"
```

---

### Task 6: Update power sphere page

**Files:**
- Modify: `src/pages/power/[sphere]/index.astro`

- [ ] **Step 1: Update imports**

Replace the import block at the top of the frontmatter:

```ts
import { url } from "@/lib/url";
import WikiPage from '@/layouts/WikiPage.astro';
import TableOfContents from '@/components/TableOfContents.astro';
import SourceBookCallout from '@/components/SourceBookCallout.astro';
import type { TocItem, TocGroup } from '@/components/TableOfContents.astro';
import { resolveEntries } from '@/lib/resolveEntries';
import { buildSections } from '@/lib/categorize';
import type { SectionResult } from '@/lib/categorize';
import { BOOK_COLLECTIONS } from '@/content/config';
import { splitBodyOnMarkers, renderMarkdownFragment } from '@/lib/renderBody';
import type { SphereEntry, ClassEntry, TalentEntry, FeatEntry, BookMeta } from '@/lib/types';
```

- [ ] **Step 2: Update `Props` interface**

Replace the `Props` interface:

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
}
```

- [ ] **Step 3: Update `getStaticPaths`**

In the sphere loop inside `getStaticPaths`, replace:

```ts
const categories = buildCategories(sphere, allTalents.filter(t => t.tier !== 'base'), feats);
```

with:

```ts
const sections = buildSections(sphere, allTalents.filter(t => t.tier !== 'base'), feats);
```

In the sphere props object, replace `categories,` with `sections,`.

In the class props object, replace `categories: [],` with `sections: [],`.

- [ ] **Step 4: Update frontmatter destructuring and TOC construction**

Replace the destructuring line:

```ts
const { kind, sphere, cls, base, allTalents, feats, sections, mainCollEntry, talentCollEntries, featCollEntries, sourceBook, bookMetaMap } = Astro.props;
```

Replace the entire `// Build ToC` block:

```ts
// Build ToC
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
      const talent = [...talentMap.values()].find(t => t.id === e.id);
      const feat = [...featMap.values()].find(f => f.id === e.id);
      return { id: e.id, label: talent?.name ?? feat?.name ?? e.id };
    }),
  })),
}));
```

- [ ] **Step 5: Update the template — replace `categories.map` block**

In the `{kind === 'sphere' && sphere && (...)}` block, replace the `{categories.map(cat => (...))}` section with:

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
              {cat.entries.map(e => {
                const talent = [...talentMap.values()].find(t => t.id === e.id);
                const feat = [...featMap.values()].find(f => f.id === e.id);
                const entry = talent || feat;
                if (!entry) return null;

                const content = talent ? talentRendered.find(r => r.id === e.id) : featRendered.find(r => r.id === e.id);
                const extBook = entry.sourceBook !== sphere!.sourceBook ? bookMetaMap.get(entry.sourceBook) : undefined;
                const tierLabel = talent ? (talent.tier.charAt(0).toUpperCase() + talent.tier.slice(1)) : 'Feat';

                return (
                  <div class="talent-entry" id={entry.id} data-pagefind-weight="0.5">
                    <div class="talent-header">
                      <div class="talent-header-top">
                        <a
                          href={url(`/power/${sphere!.id}/${talent ? '' : 'feats/'}${entry.id}/`)}
                          class="talent-name"
                          data-astro-prefetch="hover"
                        >
                          {entry.name}
                        </a>
                        {extBook && <span class="talent-source">{extBook.title}</span>}
                      </div>
                      <div class="talent-header-bottom">
                        {talent && <span class="talent-tier talent">Talent</span>}
                        <span class={`talent-tier ${talent ? talent.tier : 'feat'}`}>{tierLabel}</span>
                        {is3pp(entry.sourceBook) && <span class="talent-tag" data-tag="3pp">3PP</span>}
                        {entry.tags.map(tag => <span class="talent-tag" data-tag={tag.toLowerCase()}>{tag}</span>)}
                      </div>
                    </div>
                    {content && <div class="talent-body"><content.Content /></div>}
                  </div>
                );
              })}
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

- [ ] **Step 6: Update TOC component usage**

Replace:

```astro
<TableOfContents items={tocItems} system="power" />
```

with:

```astro
<TableOfContents overview={overview} groups={groups} system="power" />
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd spheres-wiki && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Start dev server and verify /power/alteration visually**

```bash
cd spheres-wiki && npm run dev
```

Open `http://localhost:4321/power/alteration/`. Verify:
- "Talents", "Feats", "Archetypes" section headers appear with horizontal rules
- "Body Talents", "Transformation Talents" etc. appear as subcategory headings within sections
- "Archetypes" section shows "No entries yet."
- TOC right rail shows group labels (Talents, Feats, Archetypes) as static non-clickable labels
- Subcategories under each group expand/collapse as you scroll

Other spheres (e.g. /power/alchemy/) should still render their entries under a single "Other" section with no visual regression.

- [ ] **Step 9: Stop dev server and commit**

```bash
git add src/pages/power/\[sphere\]/index.astro
git commit -m "feat: update power sphere page to buildSections and hierarchical render"
```

---

### Task 7: Update might and guile sphere pages

**Files:**
- Modify: `src/pages/might/[sphere]/index.astro`
- Modify: `src/pages/guile/[sphere]/index.astro`

Apply the exact same changes as Task 6 to both pages. The only differences are:
- `might` page: system string is `"might"`, URLs use `/might/`, wiki title is `Spheres of Might Wiki`, `activeNamespace="might"`
- `guile` page: system string is `"guile"`, URLs use `/guile/`, wiki title is `Spheres of Guile Wiki`, `activeNamespace="guile"`

- [ ] **Step 1: Update `src/pages/might/[sphere]/index.astro`**

Apply all 6 changes from Task 6 steps 1–6, using `might` in place of `power` where it appears:
- Import `buildSections` and `SectionResult` (same)
- Import `TocGroup` from `TableOfContents.astro` (same)
- `Props`: `sections: SectionResult[]` instead of `categories: CategoryResult[]`
- `getStaticPaths`: `buildSections(...)` instead of `buildCategories(...)`
- Props object: `sections,` instead of `categories,`; class path: `sections: []`
- Destructuring: `sections` instead of `categories`
- TOC block: `overview` + `groups` construction (same code)
- Template: `{sections.map(sec => ...)}` block (same but entry links use `/might/${sphere!.id}/...`)
- `<TableOfContents overview={overview} groups={groups} system="might" />`

- [ ] **Step 2: Update `src/pages/guile/[sphere]/index.astro`**

Same as Step 1 with `guile` instead of `might`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd spheres-wiki && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
cd spheres-wiki && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/might/\[sphere\]/index.astro src/pages/guile/\[sphere\]/index.astro
git commit -m "feat: update might and guile sphere pages to buildSections hierarchy"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Add `SectionDefinition` type | Task 1 |
| Add `sectionDefinitions?` to `SphereEntry` | Task 1 |
| Add `SectionResult` type | Task 2 |
| `filterEntries` private helper (DRY 3× loop) | Task 2 |
| `buildSections` function | Task 2 |
| Empty category → included with empty entries | Task 2 (tested) |
| Section with no `categories` field → empty `categories: []` | Task 2 (tested) |
| Catch-all "Other" section for unmatched entries | Task 2 (tested) |
| Catch-all only if entries remain | Task 2 (tested) |
| Keep `buildCategories` as deprecated export | Task 2 (not removed) |
| Migrate `alteration.md` to `sectionDefinitions` | Task 3 |
| CSS: `.section-group*`, `.section-empty` | Task 4 |
| CSS: `.toc-group*` | Task 4 |
| `TableOfContents` new `TocGroup` interface + props | Task 5 |
| TOC groups always visible (static labels, no collapse) | Task 5 |
| TOC subcategories collapse/expand (IO + scroll — unchanged logic) | Task 5 |
| Power page: `buildSections`, nested render, new TOC props | Task 6 |
| Might + guile pages: same | Task 7 |
| Empty section → "No entries yet." | Task 6 |
| Empty category → "No entries yet." | Task 6 |
