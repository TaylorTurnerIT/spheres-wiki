---
name: courser-class-features
description: The 21 Courser class-feature entries converted from Spheres of Guile
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit: Courser Class Features

## Scope

Covers the 21 `class-feature`-type entries for the Courser, converted from the
named feature sections of the Spheres of Guile Wikidot source. Each feature is
an individual entry tied to the Courser class with its acquisition level and
body prose. One feature (Courser Ventures) is the container that the venture
class-traits attach to. The features live under the Guile system in the Spheres
of Guile book, so `system` and `type` are derived from path.

## Requirements

### R1: Feature Set and Frontmatter
**Description:** Each of the 21 named Courser features is a schema-valid
`class-feature` entry (AGENTS.md class-family table) tied to the Courser class.
**Acceptance Criteria:**
- [ ] Exactly 21 Courser class-feature entries exist.
- [ ] The set of features is exactly: Weapon and Armor Proficiency, Skill Expertise, Forage, Survivalist, Courser Ventures, Fast Movement, Determined Stalker, Vigilant, Harrying Assault, Relentless, Stalwart, Distant Advance, Resourceful Foraging, Deadly Assault, Withstand Force, Opportune Stalker, Tireless, Unyielding, Tenacious Stalker, Incredible Vitality, Master Courser.
- [ ] Each entry's frontmatter contains `id`, `name`, `className` equal to `"courser"`, `level`, and `tags` as an empty array (`[]`).
**Dependencies:** Courser class entry (cavekit-courser-class-entry.md).

### R2: Identity Constraints
**Description:** Feature ids follow the project's id rules and the existing class-feature naming convention (unprefixed, matching the kebab-case of the feature name — consistent with how existing base class-features are named in the repo, e.g., `bestial-trait` not `shifter-bestial-trait`).
**Acceptance Criteria:**
- [ ] Each `id` equals its filename (without extension).
- [ ] Each `id` is lowercase kebab-case (matches `^[a-z0-9-]+$`).
- [ ] Feature ids are NOT prefixed with the class name (e.g., `harrying-assault` not `courser-harrying-assault`; `forage` not `courser-forage`). The exception is "Courser Ventures" whose natural kebab-case is `courser-ventures` — this is the feature name, not a class-name prefix.
- [ ] `featureId: "courser-ventures"` used in all class-traits matches the `id` of the Courser Ventures feature entry exactly.
**Dependencies:** R1.

### R3: Trait Container Flag
**Description:** The Courser Ventures feature is the container for venture
class-traits.
**Acceptance Criteria:**
- [ ] The Courser Ventures feature has `isTraitContainer` set to `true`.
- [ ] No other Courser feature sets `isTraitContainer`.
**Dependencies:** R1.

### R4: Body Conversion
**Description:** Each feature body reproduces its source section prose with
Wikidot markup stripped.
**Acceptance Criteria:**
- [ ] Each feature body contains the prose from its corresponding source section verbatim.
- [ ] No feature body contains Wikidot markup tokens (`++`, `##color|text##`, `[[`, `]]`, `^^`).
- [ ] No feature body contains an inline source-attribution line (no `*Source:*`).
**Dependencies:** R1.

### R5: Feature Levels
**Description:** Each feature's `level` matches the level at which it is gained
in the class progression table.
**Acceptance Criteria:**
- [ ] The level for each feature equals: Weapon and Armor Proficiency 1, Skill Expertise 1, Forage 1, Survivalist 1, Courser Ventures 2, Fast Movement 2, Determined Stalker 3, Vigilant 3, Harrying Assault 4, Relentless 5, Stalwart 5, Distant Advance 6, Resourceful Foraging 7, Deadly Assault 9, Withstand Force 9, Opportune Stalker 13, Tireless 14, Unyielding 15, Tenacious Stalker 17, Incredible Vitality 18, Master Courser 20.
**Dependencies:** R1, and the progression table in cavekit-courser-class-entry.md.

### R6: No System Field
**Description:** Feature `system` and `type` are derived from path (SPEC V26, C11).
**Acceptance Criteria:**
- [ ] No feature frontmatter contains a `system:` key.
- [ ] No feature frontmatter contains a `type:` key.
**Dependencies:** R1.

## Out of Scope

- The improvement/venture labels at non-feature levels (8, 10, 12, 16, 19, 20) — those are progression-table labels in the class entry, not standalone feature entries (see cavekit-courser-class-entry.md R2).
- The venture class-traits that attach to the Courser Ventures container (see cavekit-courser-core-ventures.md and cavekit-courser-drs-content.md).
- The Cook alternate class feature (see cavekit-courser-drs-content.md).
- Any rendering or trait-catalog UI behavior.

## Cross-References

- See also: cavekit-overview.md
- See also: cavekit-courser-class-entry.md
- See also: cavekit-courser-core-ventures.md
- See also: cavekit-courser-drs-content.md
