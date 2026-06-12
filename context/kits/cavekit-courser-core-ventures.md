---
name: courser-core-ventures
description: The 26 core Courser venture class-traits converted from Spheres of Guile
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit: Courser Core Ventures

## Scope

Covers the 26 `class-trait`-type venture entries for the Courser that originate
in the Spheres of Guile book itself (the ventures listed at the end of the class
description, excluding the ventures whose source is a Diamond Spheres product).
Each venture attaches to the Courser Ventures feature, carries its level gate
and any sphere prerequisites as a `requires` field, and reproduces its source
prose. These ventures live under the Guile system in the Spheres of Guile book,
so `system` and `type` are derived from path.

## Requirements

### R1: Venture Set
**Description:** Each Spheres-of-Guile-sourced Courser venture is an individual
`class-trait` entry.
**Acceptance Criteria:**
- [ ] Exactly 26 Courser venture class-trait entries exist for the Spheres of Guile book.
- [ ] The set is exactly: Combat Trick, Determined Rider, Enduring, Harvest Meat, Hunting Companion, Natural Survivor, Rogue Talent, Simple Pleasures, Terrain Expertise, Woodland Acumen, Ambusher, Deadly Hunter, Deep Wounds, Friend of the Wilds, Ironclad Stalker, Stomach Punch, Nature's Garnish, Planar Foraging, Slaughter, Thaumic Disruption, Vicious Strikes, Astral Tracking, Slaughtering Critical, Thorough Foraging, and Improved Astral Tracking.
- [ ] The five Diamond Spheres ventures (Head Smash, Perpetual Acclimation, Unabated Pursuit, Opportunistic Harry, Pin Down) are NOT among this set.
**Dependencies:** Courser class entry and Courser Ventures feature (cavekit-courser-class-entry.md, cavekit-courser-class-features.md).

### R2: Frontmatter
**Description:** Each venture is a schema-valid `class-trait` entry tied to the
Courser Ventures feature.
**Acceptance Criteria:**
- [ ] Each entry's frontmatter contains `id`, `name`, `className` equal to `"courser"`, `featureId` equal to `"courser-ventures"`, and `tags` as an empty array (`[]`).
- [ ] Each `id` equals its filename (without extension) and is lowercase kebab-case.
**Dependencies:** R1.

### R3: Level-Gate Prerequisites
**Description:** Ventures listed under a level header carry that level as part of
their `requires` field.
**Acceptance Criteria:**
- [ ] The base-level ventures (Combat Trick, Determined Rider, Enduring, Harvest Meat, Hunting Companion, Natural Survivor, Rogue Talent, Simple Pleasures, Terrain Expertise, Woodland Acumen) carry no level gate in `requires`.
- [ ] Each 4th-level venture (Ambusher, Deadly Hunter, Deep Wounds, Friend of the Wilds, Ironclad Stalker, Stomach Punch) states a 4th-level courser requirement in `requires`.
- [ ] Each 6th-level venture (Nature's Garnish, Planar Foraging, Slaughter, Thaumic Disruption, Vicious Strikes) states a 6th-level courser requirement in `requires`.
- [ ] Each 8th-level venture (Astral Tracking, Slaughtering Critical, Thorough Foraging) states an 8th-level courser requirement in `requires`.
- [ ] Each 12th-level venture (Improved Astral Tracking) states a 12th-level courser requirement in `requires`.
**Dependencies:** R2.

### R4: Sphere/Ability Prerequisites
**Description:** Ventures with sphere or ability prerequisites combine them with
any level gate in `requires`.
**Acceptance Criteria:**
- [ ] Harvest Meat's `requires` states the Survivalism sphere (harvest) package.
- [ ] Deadly Hunter's `requires` states 4th-level courser and the Survivalism sphere.
- [ ] Nature's Garnish's `requires` states 6th-level courser and the Herbalism sphere.
- [ ] Improved Astral Tracking's `requires` states 12th-level courser and the Astral Tracking venture.
**Dependencies:** R3.

### R5: Body Conversion
**Description:** Each venture body reproduces its source prose with Wikidot
markup stripped.
**Acceptance Criteria:**
- [ ] Each venture body contains its source prose verbatim.
- [ ] No venture body contains Wikidot markup tokens (`++`, `##color|text##`, `[[`, `]]`, `^^`).
- [ ] No venture body contains an inline source-attribution line (no `*Source:*`).
- [ ] No venture body restates its prerequisite inline (e.g. no `(requires ...)` appended to the name) — prerequisites live in `requires`.
**Dependencies:** R2.

### R6: Asterisk Ventures
**Description:** Ventures marked with an asterisk in the source add harrying
assault options; the asterisk carries no schema meaning.
**Acceptance Criteria:**
- [ ] Stomach Punch, Slaughter, and Thaumic Disruption have no asterisk-specific frontmatter key.
- [ ] The fact that these ventures add a harrying assault option is conveyed only by the body prose, with no literal trailing `*` left on the venture name.
**Dependencies:** R5.

### R7: No System Field
**Description:** Venture `system` and `type` are derived from path (SPEC V26, C11).
**Acceptance Criteria:**
- [ ] No venture frontmatter contains a `system:` key.
- [ ] No venture frontmatter contains a `type:` key.
**Dependencies:** R2.

## Out of Scope

- The five Diamond Spheres ventures and the Cook ACF (see cavekit-courser-drs-content.md).
- The Courser Ventures container feature itself (see cavekit-courser-class-features.md).
- Auto-linking of sphere/talent names inside `requires` text (handled by the build pipeline per SPEC V33).
- Validating that referenced spheres/talents (Survivalism, Herbalism, Navigation, rogue talents, etc.) exist as entries — those are not in scope of this conversion.

## Cross-References

- See also: cavekit-overview.md
- See also: cavekit-courser-class-entry.md
- See also: cavekit-courser-class-features.md
- See also: cavekit-courser-drs-content.md
