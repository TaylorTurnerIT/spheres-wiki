---
id: conjuration
name: "Conjuration"
system: power
type: sphere
icon: conjuration
description: "You have made contracts with outsiders, calling them to your side when you are in need."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Form Talents"
        tiers: ["basic"]
        tags: ["form"]
      - label: "Type Talents"
        tiers: ["basic"]
        tags: ["type"]
      - label: "Conjuration Talents"
        tiers: ["basic"]
        excludeTags: ["form","type"]
      - label: "Advanced Conjuration Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Conjuration Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]

---

[Summon]

### Companion Features

You may choose to make a companion Small-sized instead of Medium-sized. In this case, the companion gains a +2 bonus to Dexterity, a -2 penalty to Strength, as well as the usual changes for being Small.

A companion gains 2 skill points per level and gains the following class skills: Climb (Str), Fly (Dex), Knowledge (planes) (Int), Stealth (Dex), Swim (Str). They possess a d10 Hit Die and gain 2 good saves and 1 bad save dependent on the creature's form. A companion begins understanding and speaking one language that the caster also speaks.

**Feats:** A companion begins with one feat, and gains another feat at every odd Hit Die. A companion may gain any PC or monster feat for which it qualifies. While a companion may gain casting abilities through feats such as Basic Magic Training or Advanced Magic Training, a companion can never possess the Conjuration sphere.

**Evasion:** At 2 Hit Dice, a companion gains evasion. At 11 Hit Dice, they gain improved evasion.

**Ability Score Increase:** A companion gains a permanent +1 bonus to an ability score of the caster's choice for every 4 Hit Dice possessed.

**Devotion:** At 5 Hit Dice, a companion gains a +4 morale bonus on Will saves against charm and enchantment effects.

**Multiattack:** At 7 Hit Dice, a companion gains Multiattack as a bonus feat if it has 3 or more natural attacks and does not already have that feat.

### Conjuration Talent Types

Some talents are marked (form). Whenever you select a (form) talent, apply its effects to only a single companion. You may select (form) talents multiple times, but no more than once per companion, unless the talent says otherwise.

### Type Talents

A (type) talent counts as a (form) talent in all ways, except that an individual companion may only benefit from a single talent with the (type) descriptor. A (type) talent might change the companion's creature type, although it retains the (extraplanar) subtype.
