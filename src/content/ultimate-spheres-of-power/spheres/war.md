---
id: war
name: "War"
system: power
type: sphere
icon: war
description: "You can alter a battlefield, affecting both allies and enemies with your magic."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "War Talents"
        tiers: ["basic"]
        excludeTags: ["mandate","rally","totem"]
      - label: "Mandate Talents"
        tiers: ["basic"]
        tags: ["mandate"]
      - label: "Rally Talents"
        tiers: ["basic"]
        tags: ["rally"]
      - label: "Totem Talents"
        tiers: ["basic"]
        tags: ["totem"]
      - label: "Advanced War Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "War Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[Totem]

[Rally]

### War Talent Types

Talents marked (totem) grant you new totems. Talents marked (rally) grant you additional rallies.

#### Mandate

Talents marked (mandate) grant you ways of creating mandates. Mandates are effects that exist between a pair of allies, each of whom benefits from the actions of the other. As a standard action, you can create a mandate between two allies within medium range, one of whom may be yourself. You may concentrate to maintain a mandate, or can spend a spell point to make it last 1 minute per level without concentration. A mandate only works while the two sharing the mandate are within medium range of each other, and both are conscious and able to act.

A creature can be part of multiple mandates with the same or different creatures, but cannot be a member of the same mandate type talent multiple times.

#### Momentum

Talents marked (momentum) grant you a momentum pool, as well as a method of using it.

If you have at least one (momentum) talent, you can spend a spell point as a standard action to gain a momentum pool. This pool lasts 1 hour per caster level, and holds a number of points of momentum equal to the War caster's caster level plus their casting ability modifier.

Allies within 30 feet of you can spend points of momentum from this pool to activate any ability from any of your (momentum) talents. All of your (momentum) talents draw from the same pool, and using momentum is not considered a sphere ability and does not provoke attacks of opportunity.
