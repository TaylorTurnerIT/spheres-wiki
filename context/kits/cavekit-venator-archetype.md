---
name: venator-archetype
description: The Venator Courser archetype from Diamond Spheres Invention & Ingenuity — 1 archetype entry and 5 archetype-feature entries
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit: Venator Archetype

## Scope

Covers the Venator archetype for the Courser class, sourced from Diamond Spheres:
Invention & Ingenuity. One `archetype` entry and five `archetype-feature` entries,
all living under the Guile system in the I&I book. `system` and `type` are derived
from path (SPEC V26, C11).

Source: `/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheresofpower-wikidot-archive/pages/venator.txt`

## Requirements

### R1: Archetype Entry
**Description:** A single `archetype` entry identifies the Venator as a Courser
archetype.
**Acceptance Criteria:**
- [ ] File exists at `src/content/diamond-spheres-invention-and-ingenuity/guile/archetypes/venator.md`.
- [ ] Frontmatter: `id: venator`, `name: "Venator"`, `className: "courser"`, `tags: []`.
- [ ] No `system:` or `type:` in frontmatter (inferred from path).
- [ ] Body contains the source intro: "Sometimes, the best way to capture prey is to have it fall into your hands. The venator specializes in this methodology, and prefers to position their enemies carefully into well-placed ambushes as opposed to rushing them down."
**Dependencies:** None.

### R2: Archetype-Feature Set
**Description:** Exactly five archetype-feature entries cover the Venator's class
feature modifications.
**Acceptance Criteria:**
- [ ] Exactly five archetype-feature files exist under `src/content/diamond-spheres-invention-and-ingenuity/guile/archetype-features/venator/`.
- [ ] The set is exactly: Blended Training, Trapper, Herding Rush, Harrying Traps, Tandem Harry.
- [ ] No standalone Violent Herding file — the 8th-level improvement text is incorporated into the Herding Rush body (the source Herding Rush text already includes "At 8th level..." inline).
**Dependencies:** R1.

### R3: Archetype-Feature Frontmatter
**Description:** Each feature is a schema-valid `archetype-feature` entry.
**Acceptance Criteria:**
- [ ] Each entry's frontmatter contains `id`, `name`, `archetypeId: "venator"`, `level`, and `tags: []`.
- [ ] Each `id` equals its filename (without extension) and is lowercase kebab-case.
- [ ] No `system:` or `type:` in frontmatter (inferred from path).
- [ ] Levels: Blended Training 1, Trapper 1, Herding Rush 3, Harrying Traps 4, Tandem Harry 9.
**Dependencies:** R2.

### R4: Replaces and Alters Fields
**Description:** Each feature correctly declares which base Courser features it
modifies, using unprefixed base class-feature ids (matching the ids in
`src/content/spheres-of-guile/guile/class-features/courser/`).
**Acceptance Criteria:**
- [ ] Blended Training: `alters: ["skill-expertise"]`.
- [ ] Trapper: `replaces: ["survivalist"]`.
- [ ] Herding Rush: `replaces: ["determined-stalker"]`, `alters: ["opportune-stalker", "tenacious-stalker"]`.
- [ ] Harrying Traps: `alters: ["harrying-assault"]`.
- [ ] Tandem Harry: `replaces: ["deadly-assault"]`.
- [ ] No `replaces: ["fleeting-blow"]` on any entry — "fleeting blow" does not exist in the base Courser class. The Violent Herding source heading's 8th-level improvement text is folded into the Herding Rush body prose; no separate file is created.
**Dependencies:** R3, and the Courser class-feature ids in cavekit-courser-class-features.md R2.

### R5: Body Conversion
**Description:** Each body reproduces its source prose with Wikidot markup stripped.
**Acceptance Criteria:**
- [ ] Each body contains its source prose verbatim.
- [ ] Herding Rush body includes the full inline "At 8th level..." improvement text (which also appeared as the separate "Violent Herding" heading in the source — that heading is not reproduced as a file; its prose is folded in).
- [ ] No body contains Wikidot markup tokens (`++`, `##color|text##`, `[[`, `]]`, `^^`).
- [ ] No body contains an inline source-attribution line (no `*Source:*`).
- [ ] No body restates "This replaces X" or "This alters X" inline — those relationships live in the frontmatter fields, not the prose.
**Dependencies:** R3.

### R6: No System Field
**Description:** All entries derive `system` and `type` from path (SPEC V26, C11).
**Acceptance Criteria:**
- [ ] No entry frontmatter contains a `system:` key.
- [ ] No entry frontmatter contains a `type:` key.
**Dependencies:** R1, R2.

## Path Notes (not schema rules, just implementation guidance)

- Archetype entry path: `guile/archetypes/venator.md` → inferFromPath strips "guile",
  2-segment `["archetypes", "venator"]` → type: archetype, id: venator. `className` must
  be in frontmatter (not inferred from path for archetype entries).
- Archetype-feature path: `guile/archetype-features/venator/{id}.md` → after stripping
  "guile", 3-segment `["archetype-features", "venator", "{id}"]` → type: archetype-feature,
  archetypeId: venator (from path). Frontmatter `archetypeId: "venator"` is redundant but
  present for explicitness (frontmatter always wins per inferFromPath merge).

## Out of Scope

- The Venator archetype is DRS (Diamond Spheres: Invention & Ingenuity). It references
  the Trap sphere — that sphere's existence as a content entry is not verified or created here.
- Gourmand, Nomad, Ravener, Survivor, Wildspeaker archetypes.
- Any rendering or page-generation behavior.

## Cross-References

- See also: cavekit-courser-class-features.md (for base feature ids used in replaces/alters)
- See also: cavekit-courser-class-entry.md (for Courser class context)
