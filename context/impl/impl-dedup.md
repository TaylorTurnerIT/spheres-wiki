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
| T-009 | DONE | Created `src/pages/[system]/index.astro`; deleted power/might/guile index.astro; champions excluded; system-specific SVG banners + class lists + quick links via conditionals |
| T-010 | DONE | Created `src/pages/[system]/[sphere]/index.astro`; deleted power/might/guile sphere index; inline class-feature-collapse event retained |
| T-011 | DONE | Created `src/pages/[system]/[sphere]/[talent].astro`; deleted per-system talent routes; dual-sphere paths supported |
| T-012 | DONE | Created `src/pages/[system]/[sphere]/feats/[feat].astro`; deleted per-system feat routes; dual-sphere paths supported |
| T-013 | DONE | Created `src/pages/[system]/classes/[class]/[archetype].astro`; deleted per-system archetype routes; collEntry key prefix bugs fixed |
| T-014 | DONE | Created `src/pages/[system]/classes/[class]/traits/[trait].astro`; deleted per-system class-trait routes |
| T-015 | DONE | Created `src/pages/[system]/classes/[class].astro`; deleted per-system class routes; uses all 4 components; ArchetypeSwapper in flex `.class-header-row` |
