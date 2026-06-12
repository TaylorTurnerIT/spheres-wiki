---
name: dedup-overview
description: Master index for the deduplication and modularization campaign — extract four shared rendering components and unify seven triplicated route patterns into single dynamic routes driven by the system registry
metadata:
  type: project
  created: "2026-06-12"
  last_edited: "2026-06-12"
---

# Cavekit Overview: Deduplication and Modularization Campaign

The wiki currently maintains three system namespaces (might, power, guile) whose
route files are near-identical, differing only in a small set of system-specific
strings, and several rendering patterns (progression table, trait catalog,
class-feature card, archetype swapper) are duplicated inline across those pages.

This campaign removes that duplication along two axes:

1. **Components** — extract the four duplicated rendering patterns plus a
   tag-rendering audit into shared, reusable components that allow blind
   reimplementation with no loss of functionality or visual fidelity.
2. **Routes** — collapse the 7 route patterns × 3 systems (21 source files) into 7
   single dynamic routes, each parameterized by the system and reading all
   system-specific metadata from the single system registry. Every URL, search
   filter, and breadcrumb is preserved.

The system registry is the single source of truth for system metadata (id, label,
color, route prefix, css key, search-filter value). No parallel system list may
exist elsewhere in source.

## Kits

| Kit | Description |
|-----|-------------|
| cavekit-dedup-overview.md | This index: project description, domain map, cross-references, dependency graph, SPEC task/invariant map. |
| cavekit-dedup-components.md | Extraction of four shared components — progression table, trait catalog, class-feature block, archetype swapper — plus a tag-badge reuse audit. 5 requirements (R1–R5). |
| cavekit-dedup-routes.md | Unification of seven route patterns (21 files to 7) onto dynamic system routing that consumes the registry. 8 requirements (R1–R8). |

## Dependency Graph

Components must be extracted before routes are unified: the unified class route
(routes R6) renders the shared components, so they must exist as stable interfaces
first. Within the components kit, the four rendering components depend on the
tag-badge audit and on each other as the archetype swapper mutates their output.

```
cavekit-dedup-overview            (index, no requirements)

cavekit-dedup-components          (extract first)
   R5 TagBadge audit
      ▲
      ├── R2 TraitCatalogSection
      └── R3 ClassFeatureBlock
   R1 ClassProgressionTable
      ▲
      └── R4 ArchetypeSwapper  (depends on R1 table, R2 toggle rebind, R3 card ids, R5 tags)

           ▲
           │  (components are stable interfaces consumed by the class route)
           │
cavekit-dedup-routes              (unify after components exist)
   R1 System registry consumption   (no kit dependency; registry already exists)
      ▲
      ├── R2 System index route
      ├── R3 Sphere index route
      ├── R4 Talent route
      ├── R5 Feat route
      ├── R6 Class route        → renders components R1–R5
      ├── R7 Archetype route
      └── R8 Class trait route  → serves links produced by components R2
```

- No circular dependencies.
- The registry exists already; routes R1 has no kit dependency.
- Routes R6 depends on all four components plus the tag audit.
- Routes R8 serves the trait links the trait catalog (components R2) generates.
- Components R2 and R4 generate links using the registry (routes R1).

## Cross-Reference Map

Each kit cross-references the other kit it interacts with and this overview:

| Kit | References |
|-----|-----------|
| cavekit-dedup-components | overview, dedup-routes (registry for link generation, class data model, route targets) |
| cavekit-dedup-routes | overview, dedup-components (components rendered by R6, link targets for R8) |

## Coverage Summary

- Kits: 2 (plus this overview).
- Requirements: 13 (components 5, routes 8).
- Net source-file reduction: 21 triplicated route files collapse to 7; four
  inline rendering patterns collapse to four shared components.

## SPEC Task and Invariant Map

This campaign realizes SPEC tasks T61–T72 and is governed by SPEC invariants
V48–V53:

| SPEC item | Description | Governing requirement |
|-----------|-------------|-----------------------|
| V48 | Each route pattern has exactly one source file; no logical route in triplicate. | routes R2–R8 |
| V49 | Any rendering pattern shared across two or more pages is extracted into a shared component; inline duplication prohibited. | components R1–R4 |
| V50 | CSS classes applied exclusively by client-side JS use global scope. | components R4 |
| V51 | Class-trait tag rendering uses the tag-badge component; no inline reimplementation. | components R5 (and R2, R3) |
| V52 | Archetype hot-swap mutates existing DOM elements in place rather than replacing innerHTML on framework-scoped elements. | components R4 |
| V53 | The system registry is the sole source of system metadata consumed by all routes and components. | routes R1 (and components R2, R4) |

Tasks T61–T72 in SPEC.md track the per-component and per-route execution items for
this campaign; each task traces to a requirement in the two domain kits above.

## Validation Checklist (campaign-wide)

- [ ] Every acceptance criterion in both kits is testable by an automated agent.
- [ ] No circular dependencies (see graph above).
- [ ] Cross-references are bidirectional between the two domain kits.
- [ ] Out-of-scope sections are explicit in both kits.
- [ ] After the campaign: 7 route source files; four shared rendering components;
      zero inline duplicates of the extracted patterns; zero hardcoded system
      strings outside the registry.
- [ ] The full generated-URL set is unchanged (no additions or removals).
- [ ] The site builds with no data or schema errors (SPEC V34).
