---
name: dedup-routes
description: Unification of seven per-system route patterns from 21 near-identical source files into 7 dynamic routes that read system metadata from the single SYSTEMS registry, preserving every URL, search filter, and breadcrumb
metadata:
  type: project
  created: "2026-06-12"
  last_edited: "2026-06-12"
---

# Cavekit: Deduplication Routes

## Scope

Covers the unification of seven route patterns that currently exist once per
system (might, power, guile) as near-identical source files differing only in a
small set of system-specific strings. After unification each pattern exists once,
parameterized by the system, and reads all system-specific values from the single
system registry. The visible URL for every page must be unchanged.

There are currently 7 patterns × 3 systems = 21 source files. The target is 7
files. Each unified route resolves the active system from the URL, looks it up in
the registry, and derives every system-specific value (label, color, search filter
value, breadcrumb path, page-title suffix, active-namespace marker) from that
lookup. No system label, color, route, or filter list may exist anywhere else.

Related SPEC invariants: V48 (one source file per route pattern), V53 (the
registry is the sole source of system metadata).

## Requirements

### R1: System Registry Consumption

**Description:** Every unified route resolves the active system from the URL and
reads all system-specific metadata from the single system registry. The registry
is the sole source of system label, color, route prefix, search-filter value,
breadcrumb path, page-title suffix, and active-namespace marker.

**Accepts (per route invocation):** the active system identifier from the URL
parameter.

**Derives from the registry:** the system display label (e.g. "Spheres of Might"),
the system color, the route prefix (e.g. "/might/"), the search-filter value, the
breadcrumb path, the page-title suffix, and the active-namespace marker.

**Acceptance Criteria:**
- [ ] No source file outside the registry hardcodes a system label, color, route
      prefix, search-filter value, or breadcrumb path string (SPEC V53).
- [ ] A repository search for the literal strings "Spheres of Might", "Spheres of
      Power", and "Spheres of Guile" finds them only in the registry (or in content
      data), never inline in a route.
- [ ] Each route resolves the system from the URL parameter and fails closed (404 or
      build-time omission) for any system not present in the registry.
- [ ] Adding a new system to the registry makes all seven route patterns generate
      that system's pages with correct labels, filters, and breadcrumbs, with no
      other source edits.

**Dependencies:** None (the registry already exists). Consumed by R2–R8 and by the
shared components (cavekit-dedup-components.md R2, R4 for link generation).

### R2: System Index Route

**Description:** The per-system landing page, unified to one dynamic route over the
system parameter.

**Route signature:** `[system]/` (index).
**Per-system strings now from the registry:** system label, color, page-title
suffix, breadcrumb root, active-namespace marker, search-filter value.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates a page at `/{system}/` for every system in the registry,
      with no path change from the current URLs.
- [ ] The page title, breadcrumb root, and active-namespace marker come from the
      registry lookup for the active system.
- [ ] Search filtering uses the registry filter value for the active system.

**Dependencies:** R1.

### R3: Sphere Index Route

**Description:** The per-system, per-sphere index page.

**Route signature:** `[system]/[sphere]/` (index).
**Per-system strings now from the registry:** system label, breadcrumb path
(system root then sphere), active-namespace marker, search-filter value.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/{sphere}/` for every (system, sphere) pair that
      currently exists, with no URL change.
- [ ] Breadcrumbs read system root then sphere, with the system label and root path
      from the registry.
- [ ] Search filtering uses the registry filter value for the active system.

**Dependencies:** R1.

### R4: Talent Route

**Description:** The per-system, per-sphere talent detail page.

**Route signature:** `[system]/[sphere]/[talent]`.
**Per-system strings now from the registry:** system label, breadcrumb path
(system root, sphere, talent), active-namespace marker, search-filter value.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/{sphere}/{talent}/` for every existing talent,
      with no URL change.
- [ ] Breadcrumbs trace system root, sphere, then talent, using registry-sourced
      label and root path.
- [ ] Search filtering uses the registry filter value for the active system.

**Dependencies:** R1.

### R5: Feat Route

**Description:** The per-system, per-sphere feat detail page.

**Route signature:** `[system]/[sphere]/feats/[feat]`.
**Per-system strings now from the registry:** system label, breadcrumb path
(system root, sphere, feats, feat), active-namespace marker, search-filter value.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/{sphere}/feats/{feat}/` for every existing feat,
      with no URL change.
- [ ] Breadcrumbs trace system root, sphere, feats, then feat, using registry-sourced
      label and root path.
- [ ] Search filtering uses the registry filter value for the active system.

**Dependencies:** R1.

### R6: Class Route

**Description:** The per-system class detail page — the largest pattern (the source
of the progression table, the class-feature cards, the trait catalogs, and the
archetype swapper). Unified to one dynamic route over the system parameter.

**Route signature:** `[system]/classes/[class]`.
**Per-system strings now from the registry:**
- the active-namespace marker;
- the search-filter value, which is namespace-specific
  ("Spheres of Might" / "Spheres of Power" / "Spheres of Guile") and currently
  appears as the data-pagefind-filter value `system:Spheres of {SystemLabel}`;
- the breadcrumb path (system root then classes then class);
- the page-title suffix.

The current per-system content-filter guard (the inline check that skips classes
not belonging to the active system) becomes a filter on the system resolved from
the URL parameter rather than a hardcoded system name.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/classes/{class}/` for every class in every
      system, with no URL change.
- [ ] Only classes whose system matches the URL system parameter are generated for a
      given system; no class appears under the wrong system.
- [ ] The search filter renders as `system:Spheres of {Label}` where the label comes
      from the registry for the active system (e.g. `system:Spheres of Guile` under
      guile).
- [ ] Breadcrumbs trace system root, classes, then class, with the system label and
      root path from the registry.
- [ ] The page-title suffix and active-namespace marker come from the registry.
- [ ] The progression table, class-feature cards, trait catalogs, and archetype
      swapper render through the shared components (cavekit-dedup-components.md
      R1–R4), not inline.

**Dependencies:** R1; renders cavekit-dedup-components.md R1, R2, R3, R4, R5.

### R7: Archetype Route

**Description:** The per-system class archetype detail page.

**Route signature:** `[system]/classes/[class]/[archetype]`.
**Per-system strings now from the registry:** active-namespace marker,
search-filter value, breadcrumb path (system root, classes, class, archetype),
page-title suffix.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/classes/{class}/{archetype}/` for every existing
      archetype, with no URL change.
- [ ] Only archetypes whose system matches the URL system parameter are generated for
      a given system.
- [ ] Breadcrumbs trace system root, classes, class, then archetype, using
      registry-sourced label and root path.
- [ ] Search filtering uses the registry filter value for the active system.

**Dependencies:** R1.

### R8: Class Trait Route

**Description:** The per-system class trait detail page.

**Route signature:** `[system]/classes/[class]/traits/[trait]`.
**Per-system strings now from the registry:** active-namespace marker,
search-filter value, breadcrumb path (system root, classes, class, traits, trait),
page-title suffix.

**Acceptance Criteria:**
- [ ] Exactly one source file implements this pattern (SPEC V48).
- [ ] The route generates `/{system}/classes/{class}/traits/{trait}/` for every
      existing class trait, with no URL change.
- [ ] Only traits whose system matches the URL system parameter are generated for a
      given system.
- [ ] Breadcrumbs trace system root, classes, class, traits, then trait, using
      registry-sourced label and root path.
- [ ] Search filtering uses the registry filter value for the active system.
- [ ] Trait links generated by the trait catalog (cavekit-dedup-components.md R2)
      resolve to URLs this route serves.

**Dependencies:** R1; serves the links produced by cavekit-dedup-components.md R2.

## Validation (applies to all route requirements)

- [ ] After unification, exactly 7 route source files implement these 7 patterns;
      the per-system triplicate copies no longer exist (21 → 7).
- [ ] The full set of generated URLs before and after unification is identical (a
      diff of the generated route list shows no additions or removals).
- [ ] The site builds successfully with no data or schema errors (SPEC V34).
- [ ] Every search-filter value used by a route matches the registry value for the
      active system.

## Out of Scope

- Any change to the visible URL structure of any page.
- Any change to page layout or visual design.
- The internal behavior of the shared rendering components
  (cavekit-dedup-components.md).
- The contents or shape of the system registry itself (it already exists and is the
  source of truth; this kit only requires routes to consume it).
- The champions system, which is present in the registry but not among the three
  currently-triplicated systems — adding its pages is not required here, though R1
  guarantees the unified routes would generate them from the registry.

## Cross-References

- See also: cavekit-dedup-components.md (shared components rendered by R6, link
  targets for R8, registry consumption for component link generation)
- See also: cavekit-dedup-overview.md (campaign index, dependency graph, SPEC
  task/invariant map)
