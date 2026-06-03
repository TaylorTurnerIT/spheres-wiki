---
id: weather
name: "Weather"
system: power
type: sphere
icon: weather
description: "You can command the weather to do your bidding."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Weather Talents"
        tiers: ["basic"]
        excludeTags: ["mantle", "shroud"]
      - label: "Mantle Talents"
        tiers: ["basic"]
        tags: ["mantle"]
      - label: "Shroud Talents"
        tiers: ["basic"]
        tags: ["shroud"]
      - label: "Advanced Weather Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Weather Feats"
        tiers: ["feat"]
        excludeTags: ["dual-sphere"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[Control Weather]

### Other Weather Effects

There are weather categories not able to be manipulated by basic wielders of control weather, but available through certain talents.

#### Ash

Ash is treated as snow, except that beginning at severity level 4, any creature inhaling it must succeed at a DC 15 Fortitude save each round or be staggered for one round. Any creature moving through difficult terrain created by ash takes 1d6 slashing damage for every 10 feet they move.

Ash is a type of volcanic weather, and thus requires the Volcano Lord advanced talent to create.

#### Fallout

Fallout of severity level 3 forces creatures inside the area to attempt a Fortitude save each hour (DC 15, +1 per previous check) or take 1 point of Constitution damage. Higher severity levels increase frequency and damage. Fallout is a poison effect and requires the Radiation Lord advanced talent.

#### Vog

Vog of severity levels 2 and 3 acts as mist and fog. Starting at severity level 4, it also causes all in the area to become sickened until it leaves the area (Fortitude DC 15 negates). Vog is a type of volcanic weather and requires the Volcano Lord advanced talent.

### Weather Talent Types

#### Mantle

When you gain your first (mantle) talent, you gain the ability, as a standard action, to touch a creature and spend a spell point, bestowing your mantle upon it. Unwilling targets may attempt a Will save to resist. A mantle lasts for one hour per caster level, and is subject to spell resistance.

Having a mantle grants different effects depending on the current weather conditions. Talents marked with the (mantle) tag add effects to your mantle.

#### Shroud

A shroud is an expression of extremely localized weather, usually only large enough to affect a single target. You may activate a (shroud) talent as a standard action, placing that shroud on a single creature within your control weather range. Shroud effects persist as long as the caster concentrates. The caster may always spend a spell point as a free action to allow the effect to continue for 1 round per caster level without concentration.

Unlike control weather, shrouds produce no lasting effects; any rain evaporates immediately, ice disappears when it leaves the target, etc.
