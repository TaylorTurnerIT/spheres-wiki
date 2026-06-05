---
id: dark
name: "Dark"
system: power
type: sphere
icon: dark
description: "You may create and manipulate darkness."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Blot/Darkness/Shadow Talents"
        tiers: ["basic"]
        tags: ["blot", "darkness", "shadow"]
      - label: "Meld Talents"
        tiers: ["basic"]
        tags: ["meld"]
      - label: "Dark Talents"
        tiers: ["basic"]
        excludeTags: ["blot", "darkness", "shadow", "meld"]
      - label: "Advanced Dark Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Dark Feats"
        tiers: ["feat"]
        excludeTags: ["dual-sphere"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]

---

**Polished Spheres [DRS]**: Polished Dark is a fully rewritten Dark sphere.

[Darkness]

[Meld]

### Dark Talent Types

Some talents are marked (darkness). These talents add additional effects that can be added to a sphere of darkness. Only one such effect can be added to a single area of darkness.

Some talents are marked (meld). These talents grant you additional melds you can grant to targets.

[Darkvision]

#### Blot Talents

Dark talents listed with the (blot) tag are treated the same as talents with the (darkness) tag, except in addition to adding an effect, they cause the darkness to manifest as a blot. A blot is a darkness effect created on a two-dimensional surface, such as the ground or a wall, appearing as an inky coating rather than a volume of decreased illumination. Blots do not affect the light level of the area.

Only one (blot) talent may be applied to an individual blot. Individual blots do not stack with themselves, nor do they stack with similar (darkness) talents.

#### Shadow Talents

Talents with the (shadow) tag manipulate a target's own shadow directly, without manifesting an area of darkness at all. Unless otherwise indicated, a (shadow) talent may be applied to a target within medium range as a standard action. Only one (shadow) talent may be applied to any one target at a time, and an unwilling target is allowed a Will save to negate a shadow.

Shadows function normally within areas of glows, neither suppressing nor being suppressed by areas of glows simply by entering them.

##### Note: Light and Darkness

Whenever a glow effect (from the Light sphere) interacts with a magical darkness effect (such as from the Dark sphere), the caster of the glow effect must succeed at a magic skill check against the MSD of the darkness effect's caster. If he succeeds, the Light effect functions normally. If he fails, the Dark effect functions normally. An area filled with normal or bright light from a glow effect is no longer considered an area of darkness for Dark sphere abilities.
