# Cavekit: Unify dual-sphere into `dualSphere` field

## Goal
Eliminate `dual-sphere` tag/`dualSphere` field duplication. `dualSphere` field is
the single source of truth. `dual-sphere` tag becomes fully derived (auto-injected
for TOC grouping). Special value `"any"` handles Manabond Versatility edge case.

## Current state
| Mechanism | Purpose | Source |
|-----------|---------|--------|
| `dualSphere: "death"` | Field — secondary sphere slug | frontmatter |
| `tags: ["dual-sphere"]` | Tag — TOC grouping + "any" fallback | frontmatter + sectionDefinitions |
| sectionDefinitions `tags: ["dual-sphere"]` | Groups dual-sphere feats in TOC | sphere body .md |
| parse-wiki.mjs | Adds BOTH tag + field during import | ETL script |

## Target state
| Mechanism | Purpose | Source |
|-----------|---------|--------|
| `dualSphere: "death"` | Field — secondary sphere slug | frontmatter |
| `dualSphere: "any"` | Field — pairs with ALL spheres | frontmatter (Manabond Versatility) |
| `tags: ["dual-sphere"]` | Auto-injected by tags.ts | derived (never in frontmatter) |
| sectionDefinitions unchanged | TOC grouping via tag | sphere body .md |

## Files to change

### Phase 1: Core (schema + types)
- [ ] `src/content.config.ts:90,126` — add `.refine()` enforcing empty OR valid sphere slug OR `"any"`; `dualSphere` stays `z.string().optional()`
- [ ] `src/lib/types.ts:43,166` — `dualSphere?: string` stays same

### Phase 2: Tag injection (tags.ts)
- [ ] `src/lib/tags.ts:40-53` — replace logic:
  ```ts
  // OLD: checks existence
  const hasDualSphere = "dualSphere" in entry && entry.dualSphere;
  if ("dualSphere" in entry && entry.dualSphere) {
    tags.add(`${entry.dualSphere}-sphere`);
  }
  
  // NEW: auto-inject "dual-sphere" tag for TOC grouping, skip for "any"
  if (entry.dualSphere && entry.dualSphere !== "any") {
    tags.add("dual-sphere");
    tags.add(`${entry.dualSphere}-sphere`);
  }
  ```
  The `dual-sphere` tag is auto-injected here — never authored in frontmatter.
  For `dualSphere: "any"`, neither tag is injected.

### Phase 3: Sphere page rendering (index.astro)
- [ ] `src/pages/[system]/[sphere]/index.astro:54,56` — filtering:
  ```ts
  // OLD: exact match only
  .filter(t => t.sphere === sphere.id || t.dualSphere === sphere.id)
  
  // NEW: "any" matches all spheres
  .filter(t => t.sphere === sphere.id || t.dualSphere === sphere.id || t.dualSphere === "any")
  ```

### Phase 4: Dual-sphere page generation (feat/talent pages)
- [ ] `src/pages/[system]/[sphere]/feats/[feat].astro:52-57` — `getStaticPaths`:
  ```ts
  // OLD: one extra path per feat/talent with dualSphere set
  if (feat.dualSphere) {
    const dualSphere = [...sphereMap.values()].find(...)
    if (dualSphere) { paths.push({ params: { sphere: dualSphere.id } }) }
  }
  
  // NEW: "any" generates paths for ALL spheres in same system
  if (feat.dualSphere === "any") {
    for (const s of sphereMap.values()) {
      if (s.system === system && s.id !== feat.sphere) {
        paths.push({ params: { system, sphere: s.id, feat: feat.id }, ... })
      }
    }
  } else if (feat.dualSphere) {
    // keep existing single-match logic
  }
  ```
- [ ] Same change in `src/pages/[system]/[sphere]/[talent].astro:52-57`

### Phase 5: Content cleanup
- [ ] Remove `dual-sphere` from ALL frontmatter `tags` arrays (132+ files). The tag
  is now auto-injected — frontmatter must never contain it.
- [ ] `manabond-versatility.md` → `dualSphere: "any"`, remove `tags: ["dual-sphere"]`
- [ ] `vampiric-disruption.md` — already fixed (no dualSphere, no tag)

### Phase 6: Parser (parse-wiki.mjs)
- [ ] `scripts/parse-wiki.mjs:428,449` — remove lines that push `"dual-sphere"` into
  tags array. The tag is now auto-derived.
- [ ] `scripts/parse-wiki.mjs:669-674` — still set `dualSphere` field from body
  analysis, but do NOT add `dual-sphere` tag.
- [ ] `scripts/parse-wiki.mjs:757,815,830-834` — sectionDefinitions that reference
  `"dual-sphere"` tag stay unchanged (tag still used for TOC grouping).
- [ ] `scripts/parse-wiki.test.mjs:373-375,546-577,801-805,837` — update tests:
  remove assertions that `tags` includes `"dual-sphere"`, keep `dualSphere` field
  assertions.

### Phase 7: Audit scripts
- [ ] `scripts/check-cross-sphere.mjs:122-125` — update to accept `dualSphere: "any"`
  as valid (not just `dual-sphere` tag):
  ```ts
  if (!fm.dualSphere) {
    // error
  }
  ```
- [ ] Remove `dual-sphere` tag check entirely — only `dualSphere` field matters.
- [ ] Also scan for entries with `dual-sphere` in frontmatter tags and warn —
  because after this refactor, no entry should have it manually.

### Phase 8: Tag definition file
- [ ] Keep `src/content/__built-in__/tags/dual-sphere.md` — still needed for
  sectionDefinitions TOC grouping and the Power system index "Dual Sphere Feats"
  link. The tag is now derived, but the definition provides metadata for rendering.

## Invariants to enforce in new code
1. No frontmatter `tags` array contains `"dual-sphere"` (auto-injected)
2. `dualSphere` is empty string, valid sphere slug, or `"any"`
3. `dualSphere: "any"` → entry appears on ALL sphere pages in its system
4. `dualSphere: "any"` → `dual-sphere` tag NOT injected (no TOC grouping needed)
5. `dualSphere: "death"` → `dual-sphere` tag injected + `death-sphere` tag injected
6. Section definitions using `tags: ["dual-sphere"]` still work (tag exists)
7. Old wiki (Dual Sphere) label → `dualSphere` field (not tag) in codebase

## Entry count to touch
| Category | Files |
|----------|-------|
| Removal from frontmatter tags | ~132 |
| Schema + types | 2 |
| Tags injection logic | 1 |
| Page templates (index + feat + talent) | 3 |
| Parser (parse-wiki + tests) | 2 |
| Audit script | 1 |
| **Total** | **~141** |

## Build order
1. Phase 2 (tag injection) — makes tag auto-derived
2. Phase 5 (content cleanup) — removes tag from frontmatter, adds `dualSphere: "any"` 
3. Phase 3 + 4 (page templates) — handles "any" in filtering + page gen
4. Phase 6 (parser) — stops adding tag in ETL
5. Phase 7 (audit) — removes tag fallback from checker
6. Phase 1 (schema) — just adds validation, can go anytime
7. Full build + audit must pass at each phase boundary
