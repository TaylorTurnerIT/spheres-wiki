---
name: courser-class-entry
description: Schema-valid Courser class entry with progression table for the Spheres of Guile conversion
metadata:
  type: project
  created: 2026-06-11
  last_edited: 2026-06-11
---

# Cavekit: Courser Class Entry

## Scope

Covers the single `class`-type entry for the Courser, converted from the
Spheres of Guile Wikidot source. This includes the class frontmatter
(all class-family fields), the 20-level progression table encoded as
`classTable` JSON with the Courser's three extra columns and its
improvement/venture labels, and the class description body. The entry lives in
the Spheres of Guile book under the Guile system, so its `system` and `type`
are derived from its path and must not be declared in frontmatter.

## Requirements

### R1: Schema-Valid Class Frontmatter
**Description:** The class entry begins with a YAML frontmatter block that
satisfies the `class` entry schema (AGENTS.md class-family table) and SPEC V15/V16.
**Acceptance Criteria:**
- [ ] Frontmatter block delimited by `---` at the top of the entry.
- [ ] `id` equals `courser`.
- [ ] `name` equals `"Courser"`.
- [ ] `hitDie` equals `10`.
- [ ] `alignment` equals `"Any"`.
- [ ] `startingWealth` equals `"3d6 × 10 gp (average 105 gp). In addition, each character begins play with an outfit worth 10 gp or less."`.
- [ ] `skillRanks` equals `6`.
- [ ] `casterTier` equals `"none"`.
- [ ] `babProgression` equals `"full"`.
- [ ] `fortSaveProgression` equals `"good"`.
- [ ] `refSaveProgression` equals `"good"`.
- [ ] `willSaveProgression` equals `"poor"`.
- [ ] `classSkills` lists exactly the "Without a Trade Tradition" skills: Acrobatics, Artistry, Climb, Craft, Handle Animal, Heal, Intimidate, Knowledge (geography), Knowledge (nature), Lore, Perception, Perform, Profession, Ride, Stealth, Survival, Swim.
- [ ] `classTable` is present and is valid JSON.
**Dependencies:** None.

### R2: Progression Table Encoding
**Description:** The `classTable` JSON encodes the three Courser-specific columns
and the special-feature labels for levels that have no corresponding class-feature
entry of their own.
**Acceptance Criteria:**
- [ ] `extraHeaders` is exactly `["Fast Movement", "Any", "Utility"]`.
- [ ] Each of the 20 levels has extra-column row data for Fast Movement, Any, and Utility matching the source table (Fast Movement: +0/+10/+10/+10/+10/+20/+20/+20/+20/+30/+30/+30/+30/+40/+40/+40/+40/+50/+50/+50 ft.; Any: 0/1/1/2/2/3/3/4/4/5/5/6/6/7/7/8/8/9/9/10; Utility: 1/1/2/2/3/3/4/4/5/5/6/6/7/7/8/8/9/9/10/10).
- [ ] A special-feature label source is provided for level 8 reading "Venture".
- [ ] A special-feature label source is provided for level 10 reading "Forage improvement, Harrying assault (improved), Venture".
- [ ] A special-feature label source is provided for level 12 reading "Venture".
- [ ] A special-feature label source is provided for level 16 reading "Harrying assault (improved), Venture".
- [ ] A special-feature label source is provided for level 19 reading "Opportune stalker improvement, Resourceful foraging (fourth terrain)".
- [ ] No `specialSource` entry exists for level 20 (Master Courser is a class-feature entry at level 20; the renderer uses feature-entry names when present and ignores `specialSource` for that level, so the table at level 20 will show "Master Courser" derived from the feature entry — the "Forage improvement" and "Venture" sub-labels do not render in the table and are conveyed by feature body prose instead).
**Dependencies:** R1.

### R3: Class Description Body
**Description:** The entry body contains the Courser class description prose
from the source, with no Wikidot markup artifacts.
**Acceptance Criteria:**
- [ ] The opening description paragraph ("Scavengers and gatherers, coursers traverse the wild...") is present verbatim.
- [ ] The body contains no Wikidot markup tokens (`++`, `##color|text##`, `[[`, `]]`, `^^`).
- [ ] The body contains no inline source-attribution line (no `*Source:*`).
**Dependencies:** R1.

### R4: No System Field
**Description:** The class `system` is derived from the directory path and must
not be present in frontmatter (SPEC V26, C11).
**Acceptance Criteria:**
- [ ] Frontmatter contains no `system:` key.
- [ ] Frontmatter contains no `type:` key (inferred from path).
**Dependencies:** R1.

### R5: Identity and Location
**Description:** The entry id matches its filename and resides at the Guile
class path within the Spheres of Guile book.
**Acceptance Criteria:**
- [ ] `id` equals the filename (without extension).
- [ ] The entry resides under the Spheres of Guile book's Guile-system classes directory.
**Dependencies:** R1.

## Out of Scope

- Class-feature entries, venture entries, and archetype-feature entries (covered by the other Courser kits).
- The "Starting Age", "Skill Ranks Per Level" parenthetical (background-skill note), "Role", trade-tradition class skills, archetype list, and favored-class-bonus content from the source — not part of the class entry's required fields or body.
- Any rendering, table-generation, or template behavior (implementation concern).

## Cross-References

- See also: cavekit-overview.md
- See also: cavekit-courser-class-features.md
- See also: cavekit-courser-core-ventures.md
- See also: cavekit-courser-drs-content.md
