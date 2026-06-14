---
name: dir-validation
description: Validation script that detects conflicts between path-inferred structural fields and frontmatter-declared values, then strips path-derivable fields from Zod schema and frontmatter to make directory the sole source of truth
metadata:
  type: project
  created: "2026-06-14"
  last_edited: "2026-06-14"
---

# Cavekit: Directory Validation + Field Stripping

## Scope

Two sequential steps:
1. Write `scripts/check-dir-truth.mjs` — walks all content `.md` files, runs
   path inference, compares against frontmatter, reports every conflict.
2. Once the audit is clean: remove all path-derivable fields from Zod schema
   (`src/content.config.ts`) and strip them from all frontmatter files.

Related kit: [[dir-truth-overview]], [[tag-system]].

## Path Inference Rules (current `inferFromPath.ts` logic)

```
src/content/
  [book]/            → sourceBook = book
    [system]/        → system ∈ {power, might, guile, champions}
      feats/
        [id].md      → type=feat, sphere=undefined (no parent sphere)
      spheres/
        [sphere].md  → type=sphere, id=sphere
        [sphere]/
          talents/
            [id].md  → type=talent, sphere=sphere
      classes/
        [class]/
          [class].md → type=class, id=class, className=class
          class-features/
            [id].md  → type=class-feature, className=class
          class-traits/
            [id].md  → type=class-trait, className=class
          archetypes/
            [arch]/
              [arch].md               → type=archetype, archetypeId=arch, className=class
              archetype-features/
                [id].md               → type=archetype-feature, archetypeId=arch
      tags/
        [id].md      → type=tag
      articles/
        [id].md      → type=article
```

`id` always equals the filename stem (no extension).

## Requirements

### R1: Conflict Detection Script

**File:** `scripts/check-dir-truth.mjs`

**What it does:**

For each `.md` file under `src/content` (excluding `__built-in__`):
1. Derive the relative path from `src/content/` root.
2. Extract `sourceBook` = first path segment.
3. Run inference (port of `inferFromPath` logic) to get:
   `{ type, id, system, sphere, className, featureId, archetypeId, sourceBook }`.
4. Parse frontmatter YAML.
5. For each inferable field present in frontmatter: compare. If mismatch → record
   conflict as `{ file, field, inferred, declared }`.
6. After all files: print a table of conflicts grouped by field, count, and exit 1
   if any conflicts found.

**Output format (one line per conflict):**
```
CONFLICT  field=system  inferred=might  declared=power  src/content/alienists-handbook/might/spheres/alchemy/talents/foo.md
```

**Exit codes:** 0 = clean, 1 = conflicts found.

**Acceptance criteria:**
- Runs with `node scripts/check-dir-truth.mjs` (no build step).
- Reports every unique `(file, field)` pair that disagrees.
- Groups summary by field at the end (e.g. "3 conflicts in `system`, 1 in `sphere`").
- Does NOT modify any files.
- Excludes `__built-in__` (special case — no system).
- Handles missing frontmatter gracefully (skip with warning).

### R2: Field Stripping

**Precondition:** R1 script exits 0 (no conflicts).

**Step A — Zod schema (`src/content.config.ts`):**
Remove from `baseFields` and all discriminated union members:
- `id` (computed = filename; keep only as runtime key, not stored field)
- `system`
- `sourceBook`
- `sphere` (on talent/feat types)
- `className` (on class-feature/class-trait/archetype/archetype-feature types)
- `featureId` (on class-trait type)
- `archetypeId` (on archetype/archetype-feature types)

These fields move from "validated in schema" to "injected by loader, never written
to disk."

**Step B — `inferFromPath.ts`:**
Change merge order: inferred values win over frontmatter for the stripped fields.
Currently: `{ ...inferred, ...frontmatter }` → change to:
`{ ...frontmatter, ...inferred }` for the path-derivable fields only. All other
frontmatter fields (name, tier, tags, dualSphere, etc.) are untouched.

**Step C — Frontmatter bulk removal:**
Write a one-shot migration script `scripts/strip-path-fields.mjs` that:
1. Reads every `.md` file.
2. Removes the stripped fields from the YAML frontmatter block.
3. Writes the file in place.
4. Reports count of modified files.

Run `scripts/validate.mjs` after to confirm nothing broke.

**Acceptance criteria:**
- Zero frontmatter files contain `type`, `id`, `system`, `sourceBook`, `sphere`
  (on talents/feats), `className`, `featureId`, `archetypeId` after step C.
- `scripts/validate.mjs` passes.
- `scripts/check-dir-truth.mjs` still exits 0 (nothing re-introduced).
- Astro build passes (`npm run build`).
- All existing URLs still resolve (structural fields come from loader, not page params).
