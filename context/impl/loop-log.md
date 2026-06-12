---
created: "2026-06-11"
last_edited: "2026-06-11"
---
# Loop Log: Courser Conversion

Build site: context/plans/build-site.md

### Iteration 1 — 2026-06-11
- T-001: Courser class entry — DONE. Files: src/content/spheres-of-guile/guile/classes/courser.md. Build P, Validate P. Commit ef4da9f4. Next: T-002–T-005 parallel

### Iteration 2 — 2026-06-11
- T-002–T-005: All 21 class features (worktree agents failed; redone inline) — DONE. Files: src/content/spheres-of-guile/guile/class-features/courser/*.md (21 files). Build P, Validate P. Commit a7de6f02. Note: path must be class-features/{className}/{id}.md (inferFromPath needs className segment). Next: T-006–T-009

### Iteration 3 — 2026-06-11
- T-006–T-009: 25 core ventures — DONE. Files: src/content/spheres-of-guile/guile/class-traits/courser/*.md. Build P, Validate P. Commit 67ac433f. Kit said 26 ventures but source has 25 (off-by-one error in kit count). Next: T-010–T-011

### Iteration 4 — 2026-06-11
- T-010–T-011: 5 DRS ventures + Cook ACF — DONE. Files: diamond-spheres-hustle-and-bustle/guile/class-traits/courser/*.md (5), diamond-spheres-invention-and-ingenuity/guile/archetype-features/courser/cook.md. Build P, Validate P. Commit 51cd153b. Next: T-012 (build validation)

### Iteration 5 — 2026-06-11
- T-012: Final build validation — DONE. validate P (4064 files), build P (no new errors). All 53 output files present and valid.

---
# Loop Log: Dedup Campaign

Build site: context/plans/build-site-dedup.md

### Iteration 1 — 2026-06-12
- T-001: ClassProgressionTable — DONE. Files: src/components/ClassProgressionTable.astro. Build P, Tests P (4 pre-existing). Next: T-003, T-004
- T-002: TagBadge audit — DONE (no changes). Zero inline reimplementations. Next: T-003, T-004
- T-008: systems.ts — DONE. Files: src/lib/systems.ts. Build P. Next: T-009–T-014

### Iteration 2 — 2026-06-12
- T-003: TraitCatalogSection — DONE. Files: src/components/TraitCatalogSection.astro. Build P. Next: T-005
- T-004: ClassFeatureBlock — DONE. Files: src/components/ClassFeatureBlock.astro. Build P. Next: T-005

### Iteration 3 — 2026-06-12
- T-005: ArchetypeSwapper selector — DONE. Files: src/components/ArchetypeSwapper.astro. Build P. Next: T-006
- T-006: isCompatible + warning banner — DONE (same file, sequential). Build P. Next: T-007
- T-007: updateArchetypes full logic — DONE (same file). Build P. Next: T-009–T-015

### Iteration 4 — 2026-06-12
- T-009: [system]/index.astro — DONE. Deleted power/might/guile index.astro. Commit 4e8ce7c3. Build P (4269 pages). Next: T-010–T-014
- T-010: [system]/[sphere]/index.astro — DONE. Deleted per-system sphere index. Commit 1ce81eba.
- T-011: [system]/[sphere]/[talent].astro — DONE. Deleted per-system talent routes. Commit 1ce81eba.
- T-012: [system]/[sphere]/feats/[feat].astro — DONE. Deleted per-system feat routes. Commit 1ce81eba.
- T-013: [system]/classes/[class]/[archetype].astro — DONE. Fixed collEntry key prefix bugs. Commit d22f5b93.
- T-014: [system]/classes/[class]/traits/[trait].astro — DONE. Commit d22f5b93.
- T-015: [system]/classes/[class].astro — DONE. Uses all 4 components; ArchetypeSwapper in flex header row. Commit c5b4c88c. Build P.

### Iteration 5 — 2026-06-12
- Fix tests: scrollspy.test.ts updated (classPath→ArchetypeSwapper.astro, spherePath→[system]/[sphere]/index.astro). 5 failures remain (all pre-existing: 3 book-yaml + 2 content-audit). Build P, Tests 5 pre-existing fails only.

---
# Loop Log: Venator Archetype

Build site: context/plans/build-site-venator.md

### Iteration 1 — 2026-06-11
- T-001–T-007: All Venator content (1 archetype + 5 archetype-features) — DONE. Files: diamond-spheres-invention-and-ingenuity/guile/archetypes/venator.md + archetype-features/venator/*.md (5). Build P, Validate P (4070 files). Commit 6e1de8f1. Violent Herding prose folded into herding-rush.md body as designed.
