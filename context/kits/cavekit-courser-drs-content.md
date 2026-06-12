---
name: courser-drs-content
description: The five Diamond Spheres Courser ventures and the Cook alternate class feature
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit: Courser Diamond Spheres Content

## Scope

Covers the Courser content sourced from Diamond Spheres products: five venture
`class-trait` entries and one Cook alternate-class-feature `archetype-feature`
entry. The five ventures attach to the Courser Ventures feature and live under
the Guile system in the Diamond Spheres: Hustle & Bustle book; the Cook ACF
lives under the Guile system in the Diamond Spheres: Invention & Ingenuity book.
Two of the five ventures have confirmed source attribution; three are
attributed but unconfirmed and must flag that uncertainty in their body. As with
all entries, `system` and `type` are derived from path.

## Requirements

### R1: Diamond Spheres Ventures
**Description:** The five Diamond Spheres Courser ventures are individual
`class-trait` entries in the Hustle & Bustle book.
**Acceptance Criteria:**
- [ ] Exactly five Courser venture class-trait entries exist for the Hustle & Bustle book.
- [ ] The set is exactly: Head Smash, Perpetual Acclimation, Unabated Pursuit, Opportunistic Harry, Pin Down.
- [ ] Each entry resides under the Hustle & Bustle book's Guile-system Courser class-traits directory.
**Dependencies:** Courser class entry and Courser Ventures feature (cavekit-courser-class-entry.md, cavekit-courser-class-features.md).

### R2: Cook Alternate Class Feature
**Description:** The Cook ACF is an `archetype-feature` entry in the Invention &
Ingenuity book.
**Acceptance Criteria:**
- [ ] Exactly one Cook archetype-feature entry exists for the Invention & Ingenuity book.
- [ ] The entry resides under the Invention & Ingenuity book's Guile-system Courser archetype-features directory.
**Dependencies:** Courser class entry and the Harrying Assault and Deadly Assault features (cavekit-courser-class-entry.md, cavekit-courser-class-features.md).

### R3: Venture Frontmatter and Level Gates
**Description:** Each Diamond Spheres venture is a schema-valid `class-trait`
tied to the Courser Ventures feature with the correct level gate.
**Acceptance Criteria:**
- [ ] Each venture's frontmatter contains `id`, `name`, `className` equal to `"courser"`, `featureId` equal to `"courser-ventures"`, and `tags` as an empty array (`[]`).
- [ ] Each `id` equals its filename (without extension) and is lowercase kebab-case.
- [ ] Unabated Pursuit's `requires` states a 4th-level courser requirement.
- [ ] Head Smash's `requires` states a 6th-level courser requirement.
- [ ] Opportunistic Harry's `requires` states a 6th-level courser requirement.
- [ ] Perpetual Acclimation's `requires` states an 8th-level courser requirement.
- [ ] Pin Down's `requires` states a 12th-level courser requirement.
**Dependencies:** R1.

### R4: Cook ACF Frontmatter
**Description:** The Cook ACF carries the alternate-class-feature fields and the
features it replaces (SPEC V46).
**Acceptance Criteria:**
- [ ] `archetypeId` equals `"courser-alternate-class-features"`.
- [ ] `isAlternateClassFeature` is `true`.
- [ ] `level` equals `1`.
- [ ] `replaces` equals `["harrying-assault", "deadly-assault"]` (unprefixed, matching the class-feature ids per cavekit-courser-class-features.md R2 — `replaces` values must exactly match the base class-feature `id`s, consistent with the repo convention established by the existing ACF in spheres-of-origin).
- [ ] `id` equals its filename (without extension) and is lowercase kebab-case.
**Dependencies:** R2.

### R5: Unconfirmed-Source Notes
**Description:** The three ventures whose source attribution is unconfirmed flag
that uncertainty in their body prose.
**Acceptance Criteria:**
- [ ] Unabated Pursuit's body includes a note indicating its source attribution is unconfirmed.
- [ ] Opportunistic Harry's body includes a note indicating its source attribution is unconfirmed.
- [ ] Pin Down's body includes a note indicating its source attribution is unconfirmed.
**Dependencies:** R1.

### R6: Confirmed-Source Ventures Carry No Note
**Description:** The two ventures with confirmed source attribution carry no
unconfirmed note.
**Acceptance Criteria:**
- [ ] Head Smash's body contains no unconfirmed-source note.
- [ ] Perpetual Acclimation's body contains no unconfirmed-source note.
**Dependencies:** R1.

### R7: Body Conversion and No System Field
**Description:** Each body reproduces its source prose with Wikidot markup
stripped, and no entry declares `system` (SPEC V26, V42, C11).
**Acceptance Criteria:**
- [ ] Each entry body contains its source prose verbatim (excluding the stripped inline `^^Source:^^` line).
- [ ] No entry body contains Wikidot markup tokens (`++`, `##color|text##`, `[[`, `]]`, `^^`).
- [ ] No entry body contains an inline source-attribution line (no `*Source:*`).
- [ ] No entry frontmatter contains a `system:` key or a `type:` key.
**Dependencies:** R1, R2.

## Out of Scope

- The 26 Spheres-of-Guile core ventures (see cavekit-courser-core-ventures.md).
- The Courser class entry and class features (see cavekit-courser-class-entry.md, cavekit-courser-class-features.md).
- The virtual parent archetype for ACFs — it has no content file (SPEC V46).
- The Gourmand/Nomad/Ravener/Survivor/Venator/Wildspeaker archetypes referenced in the source archetype list.
- Determining or correcting the true source book for the three unconfirmed ventures — the note records the uncertainty; resolving it is not in scope.

## Cross-References

- See also: cavekit-overview.md
- See also: cavekit-courser-class-entry.md
- See also: cavekit-courser-class-features.md
- See also: cavekit-courser-core-ventures.md
