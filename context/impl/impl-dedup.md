---
created: "2026-06-12"
last_edited: "2026-06-12"
---
# Implementation Tracking: Dedup Campaign

Build site: context/plans/build-site-dedup.md

| Task | Status | Notes |
|------|--------|-------|
| T-001 | DONE | Created `src/components/ClassProgressionTable.astro` — props: clsName, allHeaders, tableRows; full CSS lifted from power/[class].astro; :global() for .tt, .table-archetype-feature, .table-altered-badge |
| T-002 | DONE | TagBadge audit — grep confirmed zero inline tag reimplementations across all 17 relevant pages (power/might/guile classes/talents/feats/sphere-index/traits/tags-index); all use `<TagBadge tagId={tagId} tagMap={tagMap} bookMetaMap={bookMetaMap} />` via buildOrderedTagIds(); no code changes needed |
| T-003 | TODO | TraitCatalogSection component — blocked: none (T-002 done) |
| T-004 | TODO | ClassFeatureBlock component — blocked: none (T-002 done) |
| T-005 | TODO | ArchetypeSwapper selector — blocked by T-001, T-003, T-004 |
| T-006 | TODO | ArchetypeSwapper compatibility engine — blocked by T-005 |
| T-007 | TODO | ArchetypeSwapper full update flow — blocked by T-006 |
| T-008 | DONE | Created `src/lib/systems.ts` — exports getSystemPaths(), resolveSystem(), getSystemSearchFilter(); consumes SYSTEMS from @/config/site; getSystemSearchFilter returns "system:" + label (e.g. "system:Spheres of Power") |
| T-009 | TODO | System index route — blocked by T-008 |
| T-010 | TODO | Sphere index route — blocked by T-008 |
| T-011 | TODO | Talent route — blocked by T-008 |
| T-012 | TODO | Feat route — blocked by T-008 |
| T-013 | TODO | Archetype route — blocked by T-008 |
| T-014 | TODO | Class trait route — blocked by T-008 |
| T-015 | TODO | Unified class route — blocked by T-001, T-003, T-004, T-005, T-006, T-007, T-008 |
