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
| T-003 | DONE | Created `src/components/TraitCatalogSection.astro` — featureId, featureName, entries[], systemId, className, tagMap, bookMetaMap; toggle+grid-rows collapse; links to /{system}/classes/{className}/traits/{id}/; TagBadge for all tags |
| T-004 | DONE | Created `src/components/ClassFeatureBlock.astro` — feature, Content, sourceBookTitle, traits[], tagMap, bookMetaMap, systemId, className; container path renders TraitCatalogSection; non-container renders inline class-trait; data-level preserved |
| T-005 | DONE | Created `src/components/ArchetypeSwapper.astro` — selector HTML, TomSelect init, URL persistence, astro:before-swap teardown |
| T-006 | DONE | isCompatible() + warning banner (in ArchetypeSwapper.astro — sequential pass on same file) |
| T-007 | DONE | Full updateArchetypes() — reset/replace/alter/new, table+ToC text-node mutations, class-info overrides, rebindTraitToggles (in ArchetypeSwapper.astro) |
| T-008 | DONE | Created `src/lib/systems.ts` — exports getSystemPaths(), resolveSystem(), getSystemSearchFilter(); consumes SYSTEMS from @/config/site; getSystemSearchFilter returns "system:" + label (e.g. "system:Spheres of Power") |
| T-009 | TODO | System index route — blocked by T-008 |
| T-010 | TODO | Sphere index route — blocked by T-008 |
| T-011 | TODO | Talent route — blocked by T-008 |
| T-012 | TODO | Feat route — blocked by T-008 |
| T-013 | TODO | Archetype route — blocked by T-008 |
| T-014 | TODO | Class trait route — blocked by T-008 |
| T-015 | TODO | Unified class route — blocked by T-001, T-003, T-004, T-005, T-006, T-007, T-008 |
